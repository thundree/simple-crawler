import fs from "fs";
import path from "path";

// Função para criar diretórios recursivamente
export const mkdirRecursive = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Função para gerar a data formatada no fuso horário desejado
export const getFormattedTimestamp = (): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  };

  const date = new Date().toLocaleString("pt-BR", options);
  const [day, month, year, hour, minute, second] = date
    .replace(/\s|\,|-|:|\//g, " ")
    .replace(/\s+/g, "-")
    .split("-");
  return `${year}-${month}-${day}-${hour}h-${minute}m-${second}s`;
};

// Função para gerar o nome do arquivo com timestamp
export const generateFilename = (
  name: string,
  extension: string = "webp"
): string => {
  const timestamp = getFormattedTimestamp();
  return `${name}-${timestamp}.${extension}`;
};

// Função para registrar logs
export const logResult = (
  logDir: string,
  filename: string,
  message: string
): void => {
  const logPath = path.join(logDir, filename);
  const cleanMessage = message.replace(/\n/g, " ");
  fs.appendFileSync(logPath, `${cleanMessage}\n`, "utf8");
};

// Função para criar diretório com base na URL
export const createScreenshotDir = (url: string, rootDir: string): string => {
  const urlPath = new URL(url).pathname;
  let cleanPath = urlPath.replace(/[^a-zA-Z0-9\/-]/g, "_");
  if (cleanPath.endsWith("/")) {
    cleanPath = cleanPath.replace("/", "/home");
  }

  const dirPath = path.join(rootDir, cleanPath);
  mkdirRecursive(dirPath);
  return dirPath;
};
