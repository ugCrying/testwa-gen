import { REMOTE_REQUEST } from '../utils/remoteRequest'

export const getProjectList = function(queryParams = {}) {
  return REMOTE_REQUEST.get('/v1/project/page', {
    data: {
      pageNo: 1,
      pageSize: 9999,
      order: 'desc',
      orderBy: 'id',
      // ...queryParams
    },
  })
}
