"use client";

import { createContext, useContext } from "react";

/** False when the viewer prefers reduced motion: decorative scene animation is paused. */
export const TwinMotionContext = createContext(true);
export const useTwinMotion = () => useContext(TwinMotionContext);
