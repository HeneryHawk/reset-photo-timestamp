import { writeFileSync, readFileSync, readdirSync } from "fs";
import { Command } from "commander";
import cliProgress from "cli-progress";
import path from "path";
import piexifjs from "piexifjs";

import dayjs, { Dayjs } from "dayjs";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(duration);
dayjs.extend(customParseFormat);

const dateFormat = "YYYY:MM:DD HH:mm:ss";

function getBase64DataFromJpegFile(filename: string): string {
  return readFileSync(filename).toString("binary");
}

function parseDate(dateAsString: string): Dayjs {
  return dayjs(dateAsString, dateFormat);
}

function addTime(dateAsString: string): string {
  const durationToAdd = 106220386000;

  return parseDate(dateAsString).add(durationToAdd, "ms").format(dateFormat);
}

function getFilesOfDirectory(directory: string): string[] {
  return readdirSync(directory).filter((el) => path.extname(el) === ".jpg");
}

async function run(inputDirectory: string, outputDirectory: string) {
  const files = getFilesOfDirectory(inputDirectory);
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  progressBar.start(files.length, 0);

  files.forEach((fileName, index) => {
    let imageData = getBase64DataFromJpegFile(
      path.join(inputDirectory, fileName)
    );
    const exifData = piexifjs.load(imageData);

    if (
      parseDate(exifData.Exif[piexifjs.ExifIFD.DateTimeOriginal]).year() ===
      2018
    ) {
      exifData.Exif[piexifjs.ExifIFD.DateTimeOriginal] = addTime(
        exifData.Exif[piexifjs.ExifIFD.DateTimeOriginal]
      );
      exifData.Exif[piexifjs.ExifIFD.DateTimeDigitized] = addTime(
        exifData.Exif[piexifjs.ExifIFD.DateTimeOriginal]
      );

      const newExifBinary = piexifjs.dump(exifData);
      imageData = piexifjs.insert(newExifBinary, imageData);
    }
    let fileBuffer = Buffer.from(imageData, "binary");
    writeFileSync(path.join(outputDirectory, fileName), fileBuffer);

    progressBar.update(index + 1);
  });

  progressBar.stop();
  process.exit();
}

const program = new Command();
program
  .option("-i, --input <path>", "Input directory")
  .option("-o, --output <path>", "Output directory");
program.parse(process.argv);

const options = program.opts();
run(options.input, options.output);
