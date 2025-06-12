exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('patients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.text('name').notNullable();
    table.text('phone').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('drivers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.text('name').notNullable();
    table.text('phone').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.decimal('amount', 10, 2).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
        CREATE TYPE ride_status AS ENUM ('pending', 'confirmed', 'completed');
      END IF;
    END $$;
  `);

  await knex.schema.createTable('rides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('patient_id')
      .references('id')
      .inTable('patients')
      .onDelete('SET NULL');
    table
      .uuid('driver_id')
      .references('id')
      .inTable('drivers')
      .onDelete('SET NULL');
    table.timestamp('pickup_time').notNullable();
    table.text('pickup_address').notNullable();
    table.text('dropoff_address').notNullable();
    table.text('payment_type').notNullable();
    table
      .enu('status', ['pending', 'confirmed', 'completed'], {
        useNative: true,
        enumName: 'ride_status',
        existingType: true,
      })
      .notNullable()
      .defaultTo('pending');
    table.uuid('insurance_id');
    table.text('stripe_payment_id');
    table.timestamp('completed_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('insurance_docs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('ride_id').references('id').inTable('rides').onDelete('CASCADE');
    table.text('s3_key').notNullable();
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id');
    table.text('action').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    'CREATE INDEX idx_rides_pickup_time ON rides(pickup_time)',
  );
  await knex.schema.raw('CREATE INDEX idx_rides_status ON rides(status)');
  await knex.schema.raw('CREATE INDEX idx_audit_user ON audit_logs(user_id)');
};

exports.down = async function (knex) {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_audit_user');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_rides_status');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_rides_pickup_time');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('insurance_docs');
  await knex.schema.dropTableIfExists('rides');
  await knex.schema.raw('DROP TYPE IF EXISTS ride_status');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('drivers');
  await knex.schema.dropTableIfExists('patients');
};
