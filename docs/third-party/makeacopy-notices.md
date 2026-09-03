# Third-party notices

## MakeACopy-inspired detection boundary

The document detector follows the publicly described MakeACopy/OpenCV processing principle: resize the working image to a maximum edge of `720px`, then perform grayscale, edge, contour, polygon, area, and angle/shape validation before accepting a quadrilateral. This repository does not contain, copy, or redistribute MakeACopy source code, Java packages, native libraries, or copyright headers.

## OpenCV

The Android app uses the published Maven artifact `org.opencv:opencv:4.12.0` (Apache License 2.0). OpenCV is initialized and called through its public Android API; no `org.opencv.*` source files are vendored here. The upstream license is available at https://github.com/opencv/opencv/blob/4.12.0/LICENSE.
