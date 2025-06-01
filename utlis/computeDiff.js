export function computeDiff(oldData = {}, newData = {}) {
    const updated = {};
    const added = {};
    const removed = {};
  
    for (let key in newData) {
      if (!(key in oldData)) {
        added[key] = newData[key];
      } else if (newData[key] !== oldData[key]) {
        updated[key] = { from: oldData[key], to: newData[key] };
      }
    }
  
    for (let key in oldData) {
      if (!(key in newData)) {
        removed[key] = oldData[key];
      }
    }
  
    return { added, updated, removed };
  }
  

  