/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2599178718")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": "",
    "updateRule": null,
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2599178718")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "listRule": null,
    "updateRule": "",
    "viewRule": null
  }, collection)

  return app.save(collection)
})
