import { useState } from "react";
import { backendUrl } from "../../utils/apiBase";


const ImageContainer = ({ newImage }) => {
    const [images, setNewImages] = useState([]);
    const [fallback, setFallback] = useState('');
    const getImages = async () => {
        try {
            const res = await fetch(backendUrl("/api/images/"));
            const data = await res.json();
            if(!data.files) {
                setFallback(data.msg);
            } else {
                setNewImages(data.files);
            }
        } catch (error) {
            console.error("Error fetching images:", error);
        }
    }
    return (
        <div>
            {images.length > 0 ? images.map(image => 
                <img src={image} key={image} alt={image} width="200"/>) : <h1>{fallback}</h1>}
        </div>
    )
}

export default ImageContainer;