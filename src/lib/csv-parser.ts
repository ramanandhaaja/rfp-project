import Papa from 'papaparse';

export interface CSVProduct {
  name: string;
  category: string;
  description: string;
  specifications: Record<string, any>;
  features: string[];
  powerRange?: string;
  lightOutput?: string;
  efficiency?: string;
  colorTemperature?: string;
  cri?: string;
  voltage?: string;
  frequency?: string;
  dimming?: string;
  lifespan?: string;
  warranty?: string;
  mounting?: string;
  socketType?: string;
  surgeProtection?: string;
  optics?: string;
  housing?: string;
  ipRating?: string;
  ikRating?: string;
  temperatureRange?: string;
  weight?: string;
  windSurface?: string;
  dimensions?: string;
  certifications?: string;
  accessories?: string;
  notes?: string;
}

// CSV column mapping for Dutch lighting products CSV
const COLUMN_MAPPING = {
  'Productnaam / Model': 'name',
  'Vermogensbereik (W)': 'powerRange',
  'Lichtstroom (lm)': 'lightOutput',
  'Rendement (lm/W)': 'efficiency',
  'Kleurtemperatuur (K)': 'colorTemperature',
  'Kleurweergave-index (CRI)': 'cri',
  'Nominale spanning (V)': 'voltage',
  'Frequentie (Hz)': 'frequency',
  'Dimbaarheid': 'dimming',
  'Levensduur (uren)': 'lifespan',
  'Garantie (jaren)': 'warranty',
  'Montageopties': 'mounting',
  'Socket type': 'socketType',
  'Overspanningsbeveiliging (kV)': 'surgeProtection',
  'Optieken / Lensen': 'optics',
  'Behuizing': 'housing',
  'IP-classificatie': 'ipRating',
  'IK-classificatie': 'ikRating',
  'Temperatuurbereik (°C)': 'temperatureRange',
  'Gewicht (kg)': 'weight',
  'Windvangend oppervlak (m²)': 'windSurface',
  'Afmetingen (mm)': 'dimensions',
  'Certificeringen': 'certifications',
  'Accessoires': 'accessories',
  'Opmerkingen / Opties': 'notes',
};

export function parseProductsCSV(csvText: string): Promise<CSVProduct[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        try {
          const products: CSVProduct[] = results.data.map((row: any) => {
            const product: CSVProduct = {
              name: row[Object.keys(COLUMN_MAPPING)[0]] || 'Unknown Product',
              category: 'LED Lighting', // Default category for lighting products
              description: generateProductDescription(row),
              specifications: {},
              features: [],
            };

            // Map all CSV columns to product fields
            Object.entries(COLUMN_MAPPING).forEach(([csvColumn, productField]) => {
              const value = row[csvColumn];
              if (value && value !== 'Niet gespecificeerd' && value !== '') {
                if (productField === 'name' || productField === 'category' || productField === 'description') {
                  // Already handled above
                  return;
                }

                // Store in specifications object
                product.specifications[productField] = value;

                // Also store in direct property for easy access
                (product as any)[productField] = value;
              }
            });

            // Extract features from various fields
            const featureFields = [
              product.dimming,
              product.certifications,
              product.mounting,
              product.optics,
              product.accessories
            ].filter(Boolean);

            product.features = featureFields.flatMap(field =>
              field.split(/[,;\/]/).map(f => f.trim()).filter(f => f.length > 0)
            );

            return product;
          });

          resolve(products.filter(p => p.name && p.name !== 'Unknown Product'));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

function generateProductDescription(row: any): string {
  const name = row[Object.keys(COLUMN_MAPPING)[0]] || 'Product';
  const powerRange = row['Vermogensbereik (W)'];
  const lightOutput = row['Lichtstroom (lm)'];
  const efficiency = row['Rendement (lm/W)'];
  const colorTemp = row['Kleurtemperatuur (K)'];
  const housing = row['Behuizing'];
  const ipRating = row['IP-classificatie'];
  const notes = row['Opmerkingen / Opties'];

  let description = `${name} is a professional LED lighting solution`;

  if (powerRange) description += ` with power range of ${powerRange}W`;
  if (lightOutput) description += ` and light output of ${lightOutput} lumens`;
  if (efficiency) description += ` achieving efficiency up to ${efficiency} lm/W`;
  if (colorTemp) description += `. Available in color temperatures: ${colorTemp}K`;
  if (housing) description += `. Features ${housing} housing`;
  if (ipRating) description += ` with ${ipRating} protection rating`;
  if (notes) description += `. ${notes}`;

  return description + '.';
}

export function validateCSVStructure(csvText: string): { valid: boolean; error?: string; headers?: string[] } {
  try {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      return { valid: false, error: 'CSV must have at least a header row and one data row' };
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredColumns = ['Productnaam / Model'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      return {
        valid: false,
        error: `Missing required columns: ${missingColumns.join(', ')}`,
        headers
      };
    }

    return { valid: true, headers };
  } catch (error) {
    return { valid: false, error: 'Invalid CSV format' };
  }
}