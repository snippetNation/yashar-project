/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2599178718")

  // add field
  collection.fields.addAt(5, new Field({
    "exceptDomains": [],
    "hidden": false,
    "id": "url1237396108",
    "name": "news_url",
    "onlyDomains": [],
    "presentable": false,
    "required": true,
    "system": false,
    "type": "url"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2599178718")

  // remove field
  collection.fields.removeById("url1237396108")

  return app.save(collection)
})
