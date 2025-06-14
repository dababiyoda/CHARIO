exports.up = async function (knex) {
  const key = process.env.PATIENT_DATA_KEY;
  await knex.raw('ALTER TABLE patients ALTER COLUMN name TYPE VARCHAR');
  await knex.raw('ALTER TABLE patients ALTER COLUMN phone TYPE VARCHAR');
  await knex.raw('ALTER TABLE rides ALTER COLUMN pickup_address TYPE VARCHAR');
  await knex.raw('ALTER TABLE rides ALTER COLUMN dropoff_address TYPE VARCHAR');
  await knex.raw(
    'UPDATE patients SET name = pgp_sym_encrypt(name, ?)::text, phone = pgp_sym_encrypt(phone, ?)::text',
    [key, key],
  );
  await knex.raw(
    'UPDATE rides SET pickup_address = pgp_sym_encrypt(pickup_address, ?)::text, dropoff_address = pgp_sym_encrypt(dropoff_address, ?)::text',
    [key, key],
  );
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE patients ALTER COLUMN name TYPE TEXT');
  await knex.raw('ALTER TABLE patients ALTER COLUMN phone TYPE TEXT');
  await knex.raw('ALTER TABLE rides ALTER COLUMN pickup_address TYPE TEXT');
  await knex.raw('ALTER TABLE rides ALTER COLUMN dropoff_address TYPE TEXT');
  await knex.raw(
    'UPDATE patients SET name = pgp_sym_decrypt(name::bytea, ?), phone = pgp_sym_decrypt(phone::bytea, ?)',
    [process.env.PATIENT_DATA_KEY, process.env.PATIENT_DATA_KEY],
  );
  await knex.raw(
    'UPDATE rides SET pickup_address = pgp_sym_decrypt(pickup_address::bytea, ?), dropoff_address = pgp_sym_decrypt(dropoff_address::bytea, ?)',
    [process.env.PATIENT_DATA_KEY, process.env.PATIENT_DATA_KEY],
  );
};
