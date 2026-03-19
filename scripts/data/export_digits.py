import json
from sklearn.datasets import load_digits
import numpy as np

def main():
    digits = load_digits()
    
    images = digits.images.tolist()
    labels = digits.target.tolist()
    
    num_samples = len(images)
    flat_images = []
    for img in images:
        flat_images.append([pixel / 16.0 for row in img for pixel in row])
    
    data = {
        "numSamples": num_samples,
        "imageShape": [8, 8],
        "numClasses": 10,
        "images": flat_images,
        "labels": labels
    }
    
    output_path = "../../public/data/digits.json"
    with open(output_path, "w") as f:
        json.dump(data, f)
    
    print(f"Exported {num_samples} samples to {output_path}")
    print(f"Image shape: 8x8, Classes: 0-9")

if __name__ == "__main__":
    main()