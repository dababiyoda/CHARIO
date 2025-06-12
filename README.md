# CHARIO
medical rides, simplified. Uber-style app for non-emergency transport: patients schedule trips a week ahead, insurance is auto-verified or card-paid, drivers get guaranteed pickups, and everyone tracks status in real time. Affordable, transparent, and built for healthcare logistics.

## Uploading Insurance Documents

The `uploadInsurance` function in `src/uploadInsurance.js` streams an insurance document to AWS S3 and records its public URL in the `insurance_docs` table. Set `S3_BUCKET` and your database credentials in environment variables before calling the function.
