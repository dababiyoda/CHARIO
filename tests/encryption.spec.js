jest.unmock('pg');
const { Pool } = require('pg');
const key = process.env.PATIENT_DATA_KEY;

describe('pgcrypto encryption', () => {
  let pool;
  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await pool.query(
      'CREATE TABLE IF NOT EXISTS test_patients (id serial primary key, name text, phone text, address text)',
    );
    await pool.query('TRUNCATE test_patients');
  });
  afterAll(async () => {
    await pool.end();
  });

  test('create/read/update flow encrypts data', async () => {
    const name = 'Alice';
    const phone = '123';
    const addr = 'Street';
    const insert = await pool.query(
      'INSERT INTO test_patients (name, phone, address) VALUES (pgp_sym_encrypt($1,$4)::text, pgp_sym_encrypt($2,$4)::text, pgp_sym_encrypt($3,$4)::text) RETURNING id, name, phone, address',
      [name, phone, addr, key],
    );
    const row = insert.rows[0];
    expect(row.name.startsWith('\\x')).toBe(true);
    const dec = await pool.query(
      'SELECT pgp_sym_decrypt(name::bytea,$2) as name, pgp_sym_decrypt(phone::bytea,$2) as phone, pgp_sym_decrypt(address::bytea,$2) as address FROM test_patients WHERE id=$1',
      [row.id, key],
    );
    expect(dec.rows[0]).toEqual({ name, phone, address: addr });

    const newName = 'Bob';
    await pool.query(
      'UPDATE test_patients SET name=pgp_sym_encrypt($1,$3)::text WHERE id=$2',
      [newName, row.id, key],
    );
    const updated = await pool.query(
      'SELECT name FROM test_patients WHERE id=$1',
      [row.id],
    );
    expect(updated.rows[0].name.startsWith('\\x')).toBe(true);
    const dec2 = await pool.query(
      'SELECT pgp_sym_decrypt(name::bytea,$2) as name FROM test_patients WHERE id=$1',
      [row.id, key],
    );
    expect(dec2.rows[0].name).toBe(newName);
  });
});
