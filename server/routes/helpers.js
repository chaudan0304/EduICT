export function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function parseRequestBodyBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const MAX_JSON_BODY_BYTES = 10 * 1024 * 1024;

export function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bodyBytes = 0;
    let settled = false;

    req.on('data', chunk => {
      if (settled) return;
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_JSON_BODY_BYTES) {
        settled = true;
        const error = new Error('Nội dung yêu cầu vượt quá giới hạn 10 MB.');
        error.statusCode = 413;
        reject(error);
        // Drain remaining bytes so the server can return the error response cleanly.
        req.resume();
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      if (settled) return;
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => {
      if (!settled) reject(err);
    });
  });
}

export function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = 0;
  let fileName = 'presentation.pptx';
  let fileBuffer = null;
  const files = [];
  const fields = {};

  while (true) {
    const boundaryIdx = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIdx === -1) break;

    const headerStart = boundaryIdx + boundaryBuffer.length + 2; // skip \r\n
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headersStr = buffer.subarray(headerStart, headerEnd).toString('utf-8');
    const dataStart = headerEnd + 4;
    const nextBoundaryIdx = buffer.indexOf(boundaryBuffer, dataStart);
    if (nextBoundaryIdx === -1) break;

    const dataEnd = nextBoundaryIdx - 2; // skip \r\n
    const partData = buffer.subarray(dataStart, dataEnd);

    const dispositionMatch = headersStr.match(/Content-Disposition:\s*form-data;[^\r\n]*/i);
    if (dispositionMatch) {
      const match = dispositionMatch[0];
      const filenameStarMatch = match.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      const filenameMatch = match.match(/filename="?([^";\r\n]+)"?/i);
      const nameMatch = match.match(/name="?([^";\r\n]+)"?/i);

      let currentFileName = null;
      if (filenameStarMatch) {
        try {
          currentFileName = decodeURIComponent(filenameStarMatch[1]);
        } catch {
          currentFileName = filenameStarMatch[1];
        }
      } else if (filenameMatch) {
        currentFileName = filenameMatch[1].trim();
      }

      if (currentFileName) {
        fileName = currentFileName;
        fileBuffer = partData;
        files.push({ name: currentFileName, buffer: partData });
      } else if (nameMatch) {
        fields[nameMatch[1]] = partData.toString('utf-8');
      }
    }

    start = nextBoundaryIdx;
  }

  return { fileName, fileBuffer, files, fields };
}
