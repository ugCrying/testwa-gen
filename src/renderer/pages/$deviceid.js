// @ts-check

import React from 'react'
import Device from '../components/device'

export default (props) => <Device {...props.location.query} />
// export default connect(state => state)(Home);
