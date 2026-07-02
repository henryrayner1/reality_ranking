import React, { useState } from "react";
import axios from "axios";
import ImageContainer from "./ImageContainer";
import ImageForm from "./ImageForm";

const UploadImage = () => {
  const [newImage, setNewImage] = useState([]);

  const handleNewImage = () => {
    setNewImage([...newImage, 'New Image']);
  }

  return (<div>
    <ImageContainer newImage={newImage}/>
    <ImageForm handleNewImage={handleNewImage} />
  </div>

  )
};

export default UploadImage;