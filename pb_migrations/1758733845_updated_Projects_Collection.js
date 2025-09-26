/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1671341958")

  // update collection data
  unmarshal({
    "name": "Projects"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3942078319",
    "max": 0,
    "min": 0,
    "name": "Title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "convertURLs": false,
    "hidden": false,
    "id": "editor1843675174",
    "maxSize": 0,
    "name": "description",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "editor"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1671341958")

  // update collection data
  unmarshal({
    "name": "Projects_Collection"
  }, collection)

  // remove field
  collection.fields.removeById("text3942078319")

  // remove field
  collection.fields.removeById("editor1843675174")

  return app.save(collection)
})
