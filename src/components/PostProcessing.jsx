import React from 'react';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';

export default function PostProcessing() {
  return (
    <EffectComposer disableNormalPass>
      <Bloom 
        luminanceThreshold={0.2} 
        luminanceSmoothing={0.9} 
        intensity={1.0} 
        mipmapBlur 
        radius={0.25} // Significantly decreases the feather/spread of the glow
      />
    </EffectComposer>
  );
}
