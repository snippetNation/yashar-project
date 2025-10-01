/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2848092154")

  // add field
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "bool1819017965",
    "name": "recurring",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "hidden": false,
    "id": "select2373591770",
    "maxSelect": 1,
    "name": "recurring_interval",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "One time payment",
      "daily",
      "weekly",
      "Bi-weekly",
      "Monthly"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2848092154")

  // remove field
  collection.fields.removeById("bool1819017965")

  // remove field
  collection.fields.removeById("select2373591770")

  return app.save(collection)
})
