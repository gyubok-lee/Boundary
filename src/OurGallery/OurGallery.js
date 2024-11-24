import React, { useState } from 'react';
import './OurGallery.css';

const OurGallery = () => {
    const [uploadedImage, setUploadedImage] = useState(null);
    const [changedImage, setChangedImage] = useState(null);
    const [isConceptEnabled, setIsConceptEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setUploadedImage(reader.result);
            reader.readAsDataURL(file);
            setIsConceptEnabled(true); // Enable concept selection
            setChangedImage(null); // Reset changed image
        }
    };

    const handleConceptChange = async (event) => {
        const selectedConcept = event.target.value;

        if (uploadedImage && selectedConcept) {
            setIsLoading(true);

            // Call the Python API
            try {
                const response = await fetch('http://localhost:5000/process-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ image: uploadedImage, concept: selectedConcept }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setChangedImage(data.changedImage);
                } else {
                    console.error('Error processing the image.');
                }
            } catch (error) {
                console.error('Error connecting to the API:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleDownload = () => {
        if (changedImage) {
            const link = document.createElement('a');
            link.href = changedImage;
            link.download = 'changed_image.png';
            link.click();
        }
    };

    return (
        <div className="gallery-container">
            <h1>Image Transformation</h1>
            
            <div className="upload-box">
                <input type="file" accept="image/*" onChange={handleImageUpload} />
                {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="preview-image" />}
            </div>

            <div className="concept-box">
                {isConceptEnabled ? (
                    <select onChange={handleConceptChange} defaultValue="">
                        <option value="" disabled>Select a concept</option>
                        <option value="1">Concept 1</option>
                        <option value="2">Concept 2</option>
                        <option value="3">Concept 3</option>
                    </select>
                ) : (
                    <p>Please upload your image first</p>
                )}
            </div>

            <div className="changed-image-box">
                {isLoading ? (
                    <p>Processing image...</p>
                ) : (
                    changedImage && <img src={changedImage} alt="Changed" className="preview-image" />
                )}
            </div>

            <div className="save-box">
                {changedImage && <button onClick={handleDownload}>Download Changed Image</button>}
            </div>
        </div>
    );
};

export default OurGallery;
