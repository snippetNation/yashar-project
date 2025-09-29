/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2848092154")

  // update field
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
      "Monthly",
      "yearly"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2848092154")

  // update field
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
})
