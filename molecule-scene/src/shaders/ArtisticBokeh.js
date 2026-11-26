import {
  Fn,
  Loop,
  uniform,
  float,
  int,
  vec2,
  vec4,
  abs,
  clamp,
  max,
  mix,
  pow,
  smoothstep,
  screenUV,
  screenSize,
  vogelDiskSample
} from 'three/tsl';

/**
 * Artistic Bokeh – TSL / WebGPU
 *
 * @param {TextureNode} colorNode
 * @param {Node} viewZNode
 * @param {Object} options
 */
export function artisticBokeh(
  colorNode,
  viewZNode,
  options = {}
) {

  const settings = {
    focusDistance: 5.0,
    focusRange: 1.5,
    maxBlur: 0.025,
    samples: 24,
    highlightBoost: 3.0,
    ...options
  };

  // Uniforms für dynamische Anpassungen
  const focusDistance = uniform(settings.focusDistance);
  const focusRange = uniform(settings.focusRange);
  const maxBlur = uniform(settings.maxBlur);
  const highlightBoost = uniform(settings.highlightBoost);

  const sampleCount = settings.samples;

  const bokehNode = Fn(() => {

    const uv = screenUV;

    // Originalbild
    const original = colorNode.sample(uv);

    // View-Z ist negativ vor der Kamera.
    // Wir verwenden die positive Entfernung.
    const depth = abs(viewZNode);

    // Abstand zur Fokusebene
    const focusDifference = abs(
      depth.sub(focusDistance)
    );

    // Unschärfeintensität
    const blurFactor = smoothstep(
      float(0.0),
      focusRange,
      focusDifference
    );

    // Maximale Ausdehnung der Apertur in UV-Koordinaten
    const blurRadius = blurFactor.mul(maxBlur);

    // Pixelkorrektur für das Seitenverhältnis
    const texelSize = vec2(
      float(1.0).div(screenSize.x),
      float(1.0).div(screenSize.y)
    );

    // Akkumulatoren
    const colorSum = vec4(0.0).toVar();
    const weightSum = float(0.0).toVar();

    // Gleichmäßig verteilte Apertur-Samples
    Loop(
      { start: 0, end: sampleCount, type: 'int' },
      ({ i }) => {

        const disk = vogelDiskSample(
  i,
  int(sampleCount),
  float(0.0)
);



const aspectCorrection = vec2(
  1.0,
  screenSize.x.div(screenSize.y)
);

const offset = disk
  .mul(blurRadius)
  .mul(aspectCorrection);

const sampleUV = clamp(
  uv.add(offset),
  vec2(0.001),
  vec2(0.999)
);

        // Bildsample
        const sampleColor = colorNode.sample(sampleUV);

        // Luminanz
        const luminance = sampleColor.r.mul(0.2126)
          .add(sampleColor.g.mul(0.7152))
          .add(sampleColor.b.mul(0.0722));

        // Helle Bereiche erhalten mehr Gewicht
        const highlight = pow(
          max(luminance.sub(0.5), 0.0),
          2.0
        );

        const weight = float(1.0).add(
          highlight.mul(highlightBoost)
        );

        colorSum.addAssign(
          sampleColor.mul(weight)
        );

        weightSum.addAssign(weight);
      }
    );

    // Normalisierte Farbe
    const blurredColor = colorSum.div(
      max(weightSum, 0.0001)
    );

    // Fokusbild und Unschärfebild mischen
    const finalColor = mix(
      original,
      blurredColor,
      blurFactor
    );

    return vec4(
      finalColor.rgb,
      original.a
    );

  })();

  return {
    node: bokehNode,

    uniforms: {
      focusDistance,
      focusRange,
      maxBlur,
      highlightBoost
    }
  };
}
