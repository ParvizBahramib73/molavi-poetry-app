export function wrapTextByMeasure(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
    }

    if (measure(word) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = '';
    for (const character of word) {
      const next = chunk + character;
      if (chunk && measure(next) > maxWidth) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function createPoetryQuoteImage(
  verse: string,
  poemTitle: string,
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Image sharing is only available in a browser.');
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available in this browser.');
  }

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, '#101a31');
  background.addColorStop(0.55, '#0b1223');
  background.addColorStop(1, '#17172b');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = 'rgba(212, 175, 55, 0.55)';
  context.lineWidth = 3;
  context.strokeRect(54, 54, 972, 1242);
  context.strokeStyle = 'rgba(212, 175, 55, 0.18)';
  context.lineWidth = 1;
  context.strokeRect(72, 72, 936, 1206);

  context.direction = 'rtl';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#d8b75a';
  context.font = '600 34px Vazirmatn, Tahoma, sans-serif';
  context.fillText('مولانا جلال‌الدین رومی', 540, 220);

  context.fillStyle = 'rgba(212, 175, 55, 0.65)';
  context.beginPath();
  context.arc(540, 330, 5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#fffaf0';
  context.font = '600 56px Vazirmatn, Tahoma, sans-serif';
  const lines = wrapTextByMeasure(verse, 830, (value) => context.measureText(value).width);
  const lineHeight = 92;
  const visibleLines = lines.slice(0, 9);
  const firstLineY = 660 - ((visibleLines.length - 1) * lineHeight) / 2;
  visibleLines.forEach((line, index) => {
    context.fillText(line, 540, firstLineY + index * lineHeight, 850);
  });

  context.fillStyle = '#d8b75a';
  context.font = '500 30px Vazirmatn, Tahoma, sans-serif';
  context.fillText(poemTitle, 540, 1080, 850);

  context.fillStyle = 'rgba(248, 245, 236, 0.72)';
  context.font = '400 26px Vazirmatn, Tahoma, sans-serif';
  context.fillText('با Molavi بخوان و بشنو', 540, 1180);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Could not create the poetry image.'));
      }
    }, 'image/png');
  });
}
