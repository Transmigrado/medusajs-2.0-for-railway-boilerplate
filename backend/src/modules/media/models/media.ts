import { model } from '@medusajs/framework/utils'

// Generic image row linked (1-1) to a ProductCategory or ProductCollection via
// module links (see src/links). width/height are the dimensions reported at
// upload time — used to enforce the 400x400 cap without decoding the image
// server-side.
const Media = model.define('Media', {
  id: model.id({ prefix: 'media' }).primaryKey(),
  url: model.text(),
  width: model.number(),
  height: model.number(),
})

export default Media
