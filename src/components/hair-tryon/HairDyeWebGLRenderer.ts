/**
 * HairDyeWebGLRenderer.ts
 * Motor de renderizado en GPU WebGL con modelo óptico de colorimetría capilar
 * Inspirado en papers de Google Research (CVPR 2019) y patentes de ModiFace/L'Oréal.
 */

export interface HairDyeParams {
  targetRgb: [number, number, number] // [r, g, b] normalizados [0.0 - 1.0]
  intensity: number                   // [0.0 - 1.0]
  lightnessLift: number               // [0.0 - 1.0] factor de decoloración
  gloss: number                       // [0.0 - 1.0] brillo especular de queratina
  splitMode: boolean                  // pantalla partida antes/después
  splitPosition: number               // posición de división [0.0 - 1.0]
  showOriginal: boolean               // ver original sin filtro
  mirror: boolean                     // modo espejo para cámara frontal
}

const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  uniform bool u_mirror;

  void main() {
    // Genera coordenadas UV [0, 1] a partir del quad [-1, 1]
    float u = a_position.x * 0.5 + 0.5;
    if (u_mirror) {
      u = 1.0 - u;
    }
    float v = 0.5 - a_position.y * 0.5;
    v_uv = vec2(u, v);
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision highp float;

  varying vec2 v_uv;

  uniform sampler2D u_cameraTexture; // Fotograma original (cámara o foto)
  uniform sampler2D u_maskTexture;   // Máscara float de MediaPipe
  uniform vec2      u_texelSize;     // 1.0 / resolución del frame

  uniform vec3  u_targetRgb;         // Color objetivo cosmético
  uniform float u_intensity;         // Intensidad del tinte
  uniform float u_lightnessLift;     // Decoloración digital (melanin lift)
  uniform float u_gloss;             // Brillo de cutícula / especular
  uniform bool  u_showOriginal;      // Forzar ver original
  uniform bool  u_splitMode;         // Pantalla partida activa
  uniform float u_splitPosition;     // Posición de la división [0.0, 1.0]
  uniform bool  u_mirror;            // Modo espejo activo

  // Luminancia perceptual Rec.709
  float getLuminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  // W3C Soft Light por canal (mezcla estándar de salón digital)
  float softLightChannel(float base, float blend) {
    if (blend <= 0.5) {
      return base - (1.0 - 2.0 * blend) * base * (1.0 - base);
    } else {
      float d = (base <= 0.25) ? ((16.0 * base - 12.0) * base + 4.0) * base : sqrt(base);
      return base + (2.0 * blend - 1.0) * (d - base);
    }
  }

  vec3 blendSoftLight(vec3 base, vec3 blend) {
    return vec3(
      softLightChannel(base.r, blend.r),
      softLightChannel(base.g, blend.g),
      softLightChannel(base.b, blend.b)
    );
  }

  // 1. Muestreo Bilineal Guiado con Cross-Bilateral Filtering (9 tomas)
  // Preserva pelos finos y rulos sin crear escalones dentados
  float sampleRefinedMask(vec2 uv, vec3 centerColor) {
    float centerLuma = getLuminance(centerColor);
    float totalWeight = 0.0;
    float accumMask = 0.0;

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 offset = vec2(float(x), float(y)) * u_texelSize * 1.5;
        vec2 sampleUv = uv + offset;

        vec3 neighborColor = texture2D(u_cameraTexture, sampleUv).rgb;
        float neighborLuma = getLuminance(neighborColor);
        float rawMask = texture2D(u_maskTexture, sampleUv).r;

        // Ponderación Gaussiana espacial
        float dSpatial = float(x * x + y * y);
        float wSpatial = exp(-dSpatial * 0.5);

        // Ponderación fotométrica (la cámara guía los bordes de la máscara)
        float dLuma = abs(centerLuma - neighborLuma);
        float wLuma = exp(-dLuma * dLuma / 0.02);

        float w = wSpatial * wLuma;
        accumMask += rawMask * w;
        totalWeight += w;
      }
    }

    return accumMask / max(totalWeight, 0.0001);
  }

  // 2. Guarda Analítica de Piel Humana (Skin Locus en YCbCr)
  // Evita que la tintura manche la frente, patillas o las orejas
  float evaluateSkinPenalty(vec3 rgb) {
    float Y  =  0.2990 * rgb.r + 0.5870 * rgb.g + 0.1140 * rgb.b;
    float Cb = -0.1687 * rgb.r - 0.3313 * rgb.g + 0.5000 * rgb.b + 0.5;
    float Cr =  0.5000 * rgb.r - 0.4187 * rgb.g - 0.0813 * rgb.b + 0.5;

    // Región canónica de piel en plano cromático
    float skinDist = length(vec2(Cb - 0.395, Cr - 0.60));
    return smoothstep(0.045, 0.135, skinDist);
  }

  void main() {
    // Si u_mirror está activo, v_uv ya viene invertido para la textura de cámara/máscara
    vec4 camColor = texture2D(u_cameraTexture, v_uv);
    vec3 origRgb = camColor.rgb;

    // Coordenada horizontal en pantalla [0, 1] para la línea divisoria de Antes/Después
    float screenX = v_uv.x;
    if (u_mirror) {
      screenX = 1.0 - screenX;
    }

    // Dibujar línea divisoria si Split Screen está activo
    if (u_splitMode) {
      float distToLine = abs(screenX - u_splitPosition);
      if (distToLine < u_texelSize.x * 1.5) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
      }
      // El lado izquierdo del split siempre muestra el cabello original
      if (screenX < u_splitPosition) {
        gl_FragColor = camColor;
        return;
      }
    }

    if (u_showOriginal) {
      gl_FragColor = camColor;
      return;
    }

    // 1. Obtener máscara refinada con guía de imagen de alta resolución
    float rawHairMask = sampleRefinedMask(v_uv, origRgb);

    // Descarte temprano de píxeles que no son cabello
    if (rawHairMask < 0.06) {
      gl_FragColor = camColor;
      return;
    }

    // 2. Guarda de piel en bordes
    float skinFactor = 1.0;
    if (rawHairMask < 0.75) {
      skinFactor = evaluateSkinPenalty(origRgb);
    }

    // Curva Hermite suave para el desvanecimiento de puntas y pelos sueltos
    float maskWeight = smoothstep(0.12, 0.82, rawHairMask) * skinFactor * u_intensity;
    if (maskWeight <= 0.005) {
      gl_FragColor = camColor;
      return;
    }

    float lum = getLuminance(origRgb);

    // 3. FÍSICA ÓPTICA 1: Decoloración Digital (Bleaching / Melanin Lift)
    // Permite que tonos claros (rubio, cobre, fantasía) se vean en cabello oscuro
    // sin quemar las luces ni aplanar las sombras
    float targetLum = getLuminance(u_targetRgb);
    float isDarkShade = step(targetLum, 0.14); // 1.0 si es negro o castaño muy oscuro

    float liftedLum;
    if (isDarkShade > 0.5) {
      // Para Negro Azabache (1.0) / Castaño Profundo:
      // Profundiza las sombras pero retiene el contraste y el brillo de queratina
      liftedLum = pow(lum, 1.25) * 0.78;
    } else {
      // Para tonos claros/medios: levantamiento controlado de la melanina oscura
      float bleachCurve = mix(lum, pow(lum, 0.52) * 1.18, u_lightnessLift);
      liftedLum = clamp(bleachCurve, 0.0, 1.0);
    }

    // 4. FÍSICA ÓPTICA 2: Depósito de Tinte con W3C Soft Light
    // La tintura actúa como filtro translúcido que impregna el córtex
    vec3 baseMono = vec3(liftedLum);
    vec3 dyed = blendSoftLight(baseMono, u_targetRgb);

    // Multiplicación armónica para saturar medios tonos y dar calidez de salón
    if (isDarkShade < 0.5) {
      dyed = mix(dyed, dyed * (liftedLum + 0.28), 0.38);
    }

    // 5. FÍSICA ÓPTICA 3: Preservación del Lóbulo Especular R (Modelo de Marschner)
    // Las cutículas exteriores de queratina reflejan la luz ambiente blanca.
    // Esa luz NO entra al córtex ni absorbe la tintura.
    // Detectamos las altas luces del cabello y reinyectamos el brillo blanco original
    float specularMask = smoothstep(0.48, 0.90, lum);
    float glossRetention = specularMask * u_gloss * 0.65;
    dyed = mix(dyed, origRgb, glossRetention);

    // 6. FÍSICA ÓPTICA 4: Oclusión Ambiental en Raíces y Separación de Mechones
    // Las grietas oscuras entre mechones y raíces no reflejan luz
    float shadowMask = smoothstep(0.18, 0.02, lum);
    dyed = mix(dyed, origRgb * 0.72, shadowMask * 0.50);

    // 7. Mezcla final con el fotograma original ponderada por la máscara refinada
    vec3 finalRgb = mix(origRgb, dyed, maskWeight);

    gl_FragColor = vec4(finalRgb, camColor.a);
  }
`;

export class HairDyeWebGLRenderer {
  private gl: WebGLRenderingContext | WebGL2RenderingContext
  private program: WebGLProgram
  private cameraTexture: WebGLTexture
  private maskTexture: WebGLTexture
  private quadBuffer: WebGLBuffer
  private maskUint8Array: Uint8Array | null = null

  // Uniform locations
  private uTargetRgbLoc: WebGLUniformLocation | null = null
  private uIntensityLoc: WebGLUniformLocation | null = null
  private uLightnessLiftLoc: WebGLUniformLocation | null = null
  private uGlossLoc: WebGLUniformLocation | null = null
  private uShowOriginalLoc: WebGLUniformLocation | null = null
  private uSplitModeLoc: WebGLUniformLocation | null = null
  private uSplitPositionLoc: WebGLUniformLocation | null = null
  private uMirrorLoc: WebGLUniformLocation | null = null
  private uTexelSizeLoc: WebGLUniformLocation | null = null

  constructor(canvas: HTMLCanvasElement) {
    const gl =
      canvas.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false }) ||
      canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false })

    if (!gl) {
      throw new Error('WebGL no está soportado en este dispositivo.')
    }
    this.gl = gl

    // Compilar shaders
    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC)
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Fallo al compilar programa WebGL: ' + gl.getProgramInfoLog(prog))
    }
    this.program = prog

    // Localizar uniforms
    this.uTargetRgbLoc = gl.getUniformLocation(prog, 'u_targetRgb')
    this.uIntensityLoc = gl.getUniformLocation(prog, 'u_intensity')
    this.uLightnessLiftLoc = gl.getUniformLocation(prog, 'u_lightnessLift')
    this.uGlossLoc = gl.getUniformLocation(prog, 'u_gloss')
    this.uShowOriginalLoc = gl.getUniformLocation(prog, 'u_showOriginal')
    this.uSplitModeLoc = gl.getUniformLocation(prog, 'u_splitMode')
    this.uSplitPositionLoc = gl.getUniformLocation(prog, 'u_splitPosition')
    this.uMirrorLoc = gl.getUniformLocation(prog, 'u_mirror')
    this.uTexelSizeLoc = gl.getUniformLocation(prog, 'u_texelSize')

    // Crear quad de pantalla completa
    this.quadBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )

    // Crear texturas con filtrado lineal
    this.cameraTexture = this.createTexture()
    this.maskTexture = this.createTexture()

    // Enlazar unidades de textura estáticas (0: Cámara, 1: Máscara)
    gl.useProgram(this.program)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_cameraTexture'), 0)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_maskTexture'), 1)
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error('Fallo al compilar shader WebGL: ' + err)
    }
    return shader
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return tex
  }

  /**
   * Renderiza el fotograma compuesto en WebGL a 60 FPS con aceleración de GPU
   */
  public render(
    source: TexImageSource,
    maskData: Float32Array,
    maskWidth: number,
    maskHeight: number,
    targetWidth: number,
    targetHeight: number,
    params: HairDyeParams
  ) {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
      gl.viewport(0, 0, targetWidth, targetHeight)
    }

    gl.useProgram(this.program)

    // 1. Textura de Cámara (gl.TEXTURE0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.cameraTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

    // 2. Textura de Máscara (gl.TEXTURE1)
    // Convertir Float32Array a Uint8Array reutilizando buffer para máximo rendimiento
    const pixelCount = maskWidth * maskHeight
    if (!this.maskUint8Array || this.maskUint8Array.length !== pixelCount) {
      this.maskUint8Array = new Uint8Array(pixelCount)
    }
    const uint8 = this.maskUint8Array
    for (let i = 0; i < pixelCount; i++) {
      uint8[i] = Math.min(255, Math.max(0, (maskData[i] * 255.0) | 0))
    }

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      maskWidth,
      maskHeight,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      uint8
    )

    // 3. Subir Uniforms
    gl.uniform3fv(this.uTargetRgbLoc, params.targetRgb)
    gl.uniform1f(this.uIntensityLoc, params.intensity)
    gl.uniform1f(this.uLightnessLiftLoc, params.lightnessLift)
    gl.uniform1f(this.uGlossLoc, params.gloss)
    gl.uniform1i(this.uShowOriginalLoc, params.showOriginal ? 1 : 0)
    gl.uniform1i(this.uSplitModeLoc, params.splitMode ? 1 : 0)
    gl.uniform1f(this.uSplitPositionLoc, params.splitPosition)
    gl.uniform1i(this.uMirrorLoc, params.mirror ? 1 : 0)
    gl.uniform2f(this.uTexelSizeLoc, 1.0 / targetWidth, 1.0 / targetHeight)

    // 4. Dibujar Quad de pantalla completa
    const aPosLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(aPosLoc)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer)
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  public destroy() {
    const gl = this.gl
    gl.deleteTexture(this.cameraTexture)
    gl.deleteTexture(this.maskTexture)
    gl.deleteBuffer(this.quadBuffer)
    gl.deleteProgram(this.program)
  }
}
