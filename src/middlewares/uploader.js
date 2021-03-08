import multer from 'multer';

const fileName = (req, res, next) => {
  let lastIndexof = file.originalname.lastIndexOf('.');
  let ext = file.originalname.substring(lastIndexof);
  next(null, `img-${Date.now()}${ext}`);
};

const destination = (req, file, next) => {
  next(null, `${__dirname}/../uploads`);
};

const upload = multer({
  storage: multer.diskStorage({ destination, filename }),
});
