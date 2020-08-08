// @ts-check
"use strict";
import Device from "../components/device";
import React from "react";
export default props => <Device {...props.location.query} />;
// export default connect(state => state)(Home);
