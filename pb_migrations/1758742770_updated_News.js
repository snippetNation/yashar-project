/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2599178718")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file564188284",
    "maxSelect": 99,
    "maxSize": 0,
    "mimeTypes": [
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/gif",
      "image/webp"
    ],
    "name": "gallery_image",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "file484410058",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/gif",
      "image/webp"
    ],
    "name": "cover_image",
    "presentable": false,
    "protected": false,
    "required": true,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2599178718")

  // remove field
  collection.fields.removeById("file564188284")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "file484410058",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [
      "image/png",
      "image/vnd.mozilla.apng",
      "image/jpeg",
      "image/webp",
      "image/avif"
    ],
    "name": "cover_image",
    "presentable": false,
    "protected": false,
    "required": true,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
})
