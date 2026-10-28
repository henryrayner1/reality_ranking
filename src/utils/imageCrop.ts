// Turns an AvatarEditor crop (AvatarEditor.getImage(), which is at the
// source image's own resolution) into a square PNG file no bigger than
// maxSize px, so a huge source image doesn't become a huge upload.
export const canvasToSquarePng = (source: HTMLCanvasElement, fileName: string, maxSize = 800): Promise<File> => {
  const size = Math.min(maxSize, source.width);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")?.drawImage(source, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], fileName, { type: "image/png" }));
      else reject(new Error("Failed to export cropped image"));
    }, "image/png");
  });
};
