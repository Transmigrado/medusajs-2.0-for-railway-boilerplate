import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260712120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "app_config" ("id" text not null, "dummy_value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "app_config_pkey" primary key ("id"));'
    )
    this.addSql(
      'create index if not exists "IDX_app_config_deleted_at" on "app_config" (deleted_at) where deleted_at is not null;'
    )
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "app_config" cascade;')
  }
}
