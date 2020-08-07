import RxDB from 'rxdb'

RxDB.plugin(require('pouchdb-adapter-idb'))

const collections = [
  {
    name: 'code',
    schema: {
      title: 'code schema',
      description: 'code',
      version: 0,
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        addTime: {
          type: 'string',
          primary: true,
        },
        info: {
          type: 'object',
        },
        value: {
          type: 'array',
        },
      },
      required: ['addTime', 'info', 'value'],
    },
  },
  {
    name: 'apk',
    schema: {
      title: 'apk schema',
      description: 'apk',
      version: 0,
      type: 'object',
      properties: {
        path: {
          type: 'string',
          primary: true,
        },
        name: {
          type: 'string',
        },
      },
      required: ['path', 'name'],
    },
  },
]
const _create = async function() {
  const db = await RxDB.create({
    name: 'testwa',
    adapter: 'idb',
  })
  await Promise.all(collections.map((colData) => db.collection(colData)))
  return db
}

export default _create()
