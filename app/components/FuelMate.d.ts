import * as React from 'react';

// FuelMate is authored in JS (FuelMate.jsx). This declaration tells TypeScript
// which props the component accepts, so the .tsx route pages can pass
// initialView / initialLocation without type errors.

export interface FuelMateInitialView {
  name: string;
  slug?: string;
  locate?: boolean;
  [key: string]: unknown;
}

export interface FuelMateInitialLocation {
  lat: number;
  lng: number;
  label?: string;
  state?: string;
  key?: string;
}

export interface FuelMateProps {
  initialView?: FuelMateInitialView;
  initialLocation?: FuelMateInitialLocation;
}

declare const FuelMate: React.FC<FuelMateProps>;
export default FuelMate;
