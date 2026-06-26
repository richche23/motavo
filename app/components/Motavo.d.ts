import * as React from 'react';

// Motavo is authored in JS (Motavo.jsx). This declaration tells TypeScript
// which props the component accepts, so the .tsx route pages can pass
// initialView / initialLocation without type errors.

export interface MotavoInitialView {
  name: string;
  slug?: string;
  locate?: boolean;
  [key: string]: unknown;
}

export interface MotavoInitialLocation {
  lat: number;
  lng: number;
  label?: string;
  state?: string;
  key?: string;
}

export interface MotavoProps {
  initialView?: MotavoInitialView;
  initialLocation?: MotavoInitialLocation;
}

declare const Motavo: React.FC<MotavoProps>;
export default Motavo;
