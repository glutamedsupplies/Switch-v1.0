# GMS Unity Product Viewer

Place the exported Unity WebGL build in:

```text
backend/public/unity/product-viewer/Build/
```

Default expected files:

```text
Build/ProductViewer.loader.js
Build/ProductViewer.data
Build/ProductViewer.framework.js
Build/ProductViewer.wasm
```

If your Unity export uses different names, add `unity-build.json` beside this file:

```json
{
  "loaderUrl": "Build/YourBuild.loader.js",
  "dataUrl": "Build/YourBuild.data",
  "frameworkUrl": "Build/YourBuild.framework.js",
  "codeUrl": "Build/YourBuild.wasm",
  "companyName": "GMS",
  "productName": "Product Viewer",
  "productVersion": "1.0"
}
```

The host passes product data to Unity after load:

```json
{
  "modelUrl": "/uploads/example.gltf",
  "frames": ["/uploads/front.webp", "/uploads/right.webp"]
}
```

Implement a Unity scene object named `ProductViewerBridge` with a public method:

```csharp
public void LoadProductJson(string json)
```

Use that method to load the generated GLTF/GLB or the six frame textures.
