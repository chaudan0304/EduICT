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

export function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
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
