import React, { useState } from 'react';

const ImageForm = ({handleNewImage}) => {

    const uploadAction = async (image) => {
        const fd = new FormData();
        fd.append('image', image);
        const config = {
            method: 'POST',
            body: fd
        };

        try {
            const res = await fetch('/api/images/upload', config);
            const data = await res.json();
            console.log(data);
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    }

    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setImage(file);
        setPreview(!!file);
    };

    const clearImage = () => {
        setImage(null);
        setPreview(false);
    };

    const handleSubmit = () => {
        if (!image) return;
        uploadAction(image);
        setPreview(false);
        setImage(null);
        handleNewImage();
    };

    return (
        <div>
            {preview && image ? (
                <div>
                    <button onClick={clearImage}>X</button>
                    <h5>Image Preview</h5>
                    <img src={URL.createObjectURL(image)} alt="preview" width="200" />
                    <button onClick={handleSubmit}>Submit</button>
                </div>
            ) : (
                <div>
                    <input className="cursor-pointer bg-neutral-secondary-medium border rounded border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full shadow-xs placeholder:text-body" type="file" onChange={handleImageUpload} accept='.jpg, .jpeg, .png, .svg'/>
                </div>
            )}
        </div>
    )
}

export default ImageForm;