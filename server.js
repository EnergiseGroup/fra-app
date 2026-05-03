require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Multer - store in memory for direct base64 conversion
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Section prompts
const SECTION_PROMPTS = {
  electrical: `You are a fire risk assessor completing a PAS 79-2:2020 Fire Risk Assessment for a residential/mixed-use building.
Analyse the uploaded photo(s) for section: ELECTRICAL SOURCES OF IGNITION (Clause 13).
Look for: consumer units (plastic vs metal enclosures), fire rating of electrical intake areas, exposed wiring, proximity of combustibles to electrical equipment, PAT test labels visible, evidence of overloading, EICR certificates visible.
Respond in this exact JSON format:
{
  "status": "Satisfactory" or "Unsatisfactory" or "Requires Further Investigation" or "N/A",
  "observations": "Detailed bullet-point observations of what is visible in the photo(s). Be specific about locations, conditions and any deficiencies noted.",
  "actions": "Specific recommended remedial actions and control measures referencing BS 7671 where applicable.",
  "timescale": "Immediately" or "1 month" or "3 months" or "6 months" or "12 months"
}
Respond ONLY with the JSON object, no other text.`,

  smoking: `You are a fire risk assessor completing a PAS 79-2:2020 Fire Risk Assessment for a residential/mixed-use building.
Analyse the uploaded photo(s) for sections: SMOKING (Clause 13) and ARSON (Clause 13).
Look for: no-smoking signs (present/absent/faded/compliant), designated smoking areas, access control on entrance door (intercom, key fob, coded lock), combustible materials stored near the building exterior, bins near entrances, unlocked communal areas accessible to public.
Respond in this exact JSON format:
{
  "status": "Satisfactory" or "Unsatisfactory" or "Requires Further Investigation" or "N/A",
  "observations": "Detailed bullet-point observations. Note specific signage, access control measures, and any fire load near the building.",
  "actions": "Specific recommended actions with reference to relevant guidance.",
  "timescale": "Immediately" or "1 month" or "3 months" or "6 months" or "12 months"
}
Respond ONLY with the JSON object, no other text.`,

  housekeeping: `You are a fire risk assessor completing a PAS 79-2:2020 Fire Risk Assessment for a residential/mixed-use building.
Analyse the uploaded photo(s) for section: HOUSEKEEPING (Clause 13).
Look for: items stored in communal escape routes or stairwells, combustible materials near ignition sources, meter/gas cupboard doors (open/closed/fire-rated), cleaning equipment storage, general clutter, waste accumulation, storage under staircases.
Respond in this exact JSON format:
{
  "status": "Satisfactory" or "Unsatisfactory" or "Requires Further Investigation" or "N/A",
  "observations": "Detailed bullet-point observations of housekeeping standards observed.",
  "actions": "Specific recommended actions to improve housekeeping.",
  "timescale": "Immediately" or "1 month" or "3 months" or "6 months" or "12 months"
}
Respond ONLY with the JSON object, no other text.`,

  escape: `You are a fire risk assessor completing a PAS 79-2:2020 Fire Risk Assessment for a residential/mixed-use building.
Analyse the uploaded photo(s) for section: MEANS OF ESCAPE (Clause 15c) and FIRE DOORS.
Look for: fire door condition (gaps around frame, intumescent strips, cold smoke seals), self-closing devices (present/missing/faulty), door closers (BS EN 1154 compliance), escape route widths and obstructions, staircase condition, emergency lighting units, exit door operation, signage on fire doors, attic hatch condition.
Respond in this exact JSON format:
{
  "status": "Satisfactory" or "Unsatisfactory" or "Requires Further Investigation" or "N/A",
  "observations": "Detailed bullet-point observations. Note specific door locations and compliance issues.",
  "actions": "Specific recommended actions referencing BS 8214:2016 and BS EN 1154 where applicable.",
  "timescale": "Immediately" or "1 month" or "3 months" or "6 months" or "12 months"
}
Respond ONLY with the JSON object, no other text.`,

  systems: `You are a fire risk assessor completing a PAS 79-2:2020 Fire Risk Assessment for a residential/mixed-use building.
Analyse the uploaded photo(s) for: MEANS OF GIVING WARNING (Clause 15b), EMERGENCY ESCAPE LIGHTING (Clause 15e), MANUAL FIRE EXTINGUISHING APPLIANCES (Clause 15f).
Look for: fire alarm panel (make/model if visible, zone indicators, fault lights, last service date), smoke/heat detectors (type, location, condition), emergency lighting luminaires and test buttons, fire extinguishers (type, location, condition, wall-mounted vs floor, date tags visible, obstructions, appropriate type for risk).
Respond in this exact JSON format:
{
  "status": "Satisfactory" or "Unsatisfactory" or "Requires Further Investigation" or "N/A",
  "observations": "Detailed bullet-point observations of all fire systems and equipment visible.",
  "actions": "Specific recommended actions referencing BS 5839, BS 5266 and BS 5306 where applicable.",
  "timescale": "Immediately" or "1 month" or "3 months" or "6 months" or "12 months"
}
Respond ONLY with the JSON object, no other text.`,

  compartmentation: `You are a fire risk assessor completing a PAS 79-2:2020 Fire Risk Assessment for a residential/mixed-use building.
Analyse the uploaded photo(s) for section: MEASURES TO LIMIT FIRE SPREAD (Clause 15g).
Look for: service riser access panels (fire-rated or not, condition), intumescent collars around pipe penetrations, fire stopping around cables/pipes passing through walls/floors, ceiling linings (combustible or not), attic hatch condition and fire rating, visible fire barriers, any open voids, cavity barriers.
Respond in this exact JSON format:
{
  "status": "Satisfactory" or "Unsatisfactory" or "Requires Further Investigation" or "N/A",
  "observations": "Detailed bullet-point observations of compartmentation measures visible.",
  "actions": "Specific recommended actions to improve fire compartmentation.",
  "timescale": "Immediately" or "1 month" or "3 months" or "6 months" or "12 months"
}
Respond ONLY with the JSON object, no other text.`,

  management: `You are a fire risk assessor completing a PAS 79-2:2020 Fire Risk Assessment for a residential/mixed-use building.
Analyse the uploaded photo(s) for: FIRE SAFETY SIGNS (Clause 15d), PROCEDURES & ARRANGEMENTS (Clause 16), RECORDS (Clause 16k).
Look for: fire action notices (present/absent/legible/appropriately located), fire assembly point signs, directional escape route signs (green running man), premises information box, fire log book, any records of testing visible, fire emergency plan notices, fire marshal identification signage.
Respond in this exact JSON format:
{
  "status": "Satisfactory" or "Unsatisfactory" or "Requires Further Investigation" or "N/A",
  "observations": "Detailed bullet-point observations of management, signage and records.",
  "actions": "Specific recommended actions to improve fire safety management.",
  "timescale": "Immediately" or "1 month" or "3 months" or "6 months" or "12 months"
}
Respond ONLY with the JSON object, no other text.`
};

// POST /api/analyse — receive photos, return AI analysis
app.post('/api/analyse', upload.array('photos', 10), async (req, res) => {
  try {
    const { sectionId } = req.body;

    if (!sectionId || !SECTION_PROMPTS[sectionId]) {
      return res.status(400).json({ error: 'Invalid section ID' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Build image content blocks
    const imageBlocks = req.files.map(file => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: file.mimetype,
        data: file.buffer.toString('base64')
      }
    }));

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: SECTION_PROMPTS[sectionId] }
        ]
      }]
    });

    const text = response.content.map(c => c.text || '').join('');

    // Parse JSON from response
    let result;
    try {
      // Strip any markdown fences if present
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(clean);
    } catch (e) {
      // If JSON parse fails, return raw text
      result = {
        status: 'Requires Further Investigation',
        observations: text,
        actions: 'Please review the analysis above manually.',
        timescale: '1 month'
      };
    }

    res.json({ success: true, result });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// POST /api/summary — generate executive summary from all section data
app.post('/api/summary', express.json(), async (req, res) => {
  try {
    const { property, sections, riskRating } = req.body;

    const sectionText = sections.map(s =>
      `## ${s.name}\nStatus: ${s.status || 'Not assessed'}\nObservations: ${s.observations || 'None'}\nActions: ${s.actions || 'None'}`
    ).join('\n\n---\n\n');

    const prompt = `You are a fire risk assessor. Based on the following survey findings, write a concise professional executive summary for a PAS 79-2:2020 Fire Risk Assessment report.

Property: ${property.address}
Assessor: ${property.assessor}
Date: ${property.date}
Responsible Person: ${property.rp}
Flats: ${property.flats} | Floors: ${property.floors} | Max Occupancy: ${property.occ}
Construction: ${property.construction}
Overall Risk Rating: ${riskRating || 'Not specified'}

SECTION FINDINGS:
${sectionText}

Write 2-3 paragraphs covering: overall fire safety status, key deficiencies found, and general recommendations. Use formal FRA report language. Do not use markdown formatting - plain paragraphs only.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = response.content.map(c => c.text || '').join('');
    res.json({ success: true, summary });

  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: err.message || 'Summary generation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Energise FRA App running on port ${PORT}`);
});
