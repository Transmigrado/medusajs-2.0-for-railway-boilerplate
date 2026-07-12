import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260712150000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table if not exists "media" ("id" text not null, "url" text not null, "width" integer not null, "height" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "media_pkey" primary key ("id"));'
    )
    this.addSql(
      'create index if not exists "IDX_media_deleted_at" on "media" (deleted_at) where deleted_at is not null;'
    )
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "media" cascade;')
  }
}
