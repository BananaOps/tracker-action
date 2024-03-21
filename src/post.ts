const {post} = require("./common");

(async () => {
  await post()
  console.debug("post action")
})();
