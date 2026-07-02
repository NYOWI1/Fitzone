import trainer1Img from "../assets/images/trainer1.png";
import trainer2Img from "../assets/images/trainer2.png";
import trainer3Img from "../assets/images/trainer3.png";
import trainer4Img from "../assets/images/trainer4.png";

const trainerImages = {
  trainer1: trainer1Img,
  trainer2: trainer2Img,
  trainer3: trainer3Img,
  trainer4: trainer4Img,
};

export function attachTrainerImage(trainer) {
  return {
    ...trainer,
    image: trainerImages[trainer.imageKey] || trainer1Img,
  };
}
