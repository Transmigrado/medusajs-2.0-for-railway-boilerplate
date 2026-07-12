import { model } from '@medusajs/framework/utils'

// Test model for the "admin controls the mobile app" pattern: a single row the
// store endpoint reads at app startup. Will grow real fields (theme colors,
// menu toggles, logo/icon asset ids) once the module -> migration -> store
// endpoint round trip is confirmed end-to-end.
const AppConfig = model.define('AppConfig', {
  id: model.id({ prefix: 'app_cfg' }).primaryKey(),
  dummy_value: model.text(),
})

export default AppConfig
