// ../../../../../node_modules/d3-force-3d/src/center.js
function center_default(x2, y2, z2) {
  var nodes, strength = 1;
  if (x2 == null)
    x2 = 0;
  if (y2 == null)
    y2 = 0;
  if (z2 == null)
    z2 = 0;
  function force() {
    var i, n = nodes.length, node, sx = 0, sy = 0, sz = 0;
    for (i = 0; i < n; ++i) {
      node = nodes[i], sx += node.x || 0, sy += node.y || 0, sz += node.z || 0;
    }
    for (sx = (sx / n - x2) * strength, sy = (sy / n - y2) * strength, sz = (sz / n - z2) * strength, i = 0; i < n; ++i) {
      node = nodes[i];
      if (sx) {
        node.x -= sx;
      }
      if (sy) {
        node.y -= sy;
      }
      if (sz) {
        node.z -= sz;
      }
    }
  }
  force.initialize = function(_) {
    nodes = _;
  };
  force.x = function(_) {
    return arguments.length ? (x2 = +_, force) : x2;
  };
  force.y = function(_) {
    return arguments.length ? (y2 = +_, force) : y2;
  };
  force.z = function(_) {
    return arguments.length ? (z2 = +_, force) : z2;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };
  return force;
}

// ../../../../../node_modules/d3-binarytree/src/add.js
function add_default(d) {
  const x2 = +this._x.call(null, d);
  return add(this.cover(x2), x2, d);
}
function add(tree, x2, d) {
  if (isNaN(x2))
    return tree;
  var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, x1 = tree._x1, xm, xp, right, i, j;
  if (!node)
    return tree._root = leaf, tree;
  while (node.length) {
    if (right = x2 >= (xm = (x0 + x1) / 2))
      x0 = xm;
    else
      x1 = xm;
    if (parent = node, !(node = node[i = +right]))
      return parent[i] = leaf, tree;
  }
  xp = +tree._x.call(null, node.data);
  if (x2 === xp)
    return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  do {
    parent = parent ? parent[i] = new Array(2) : tree._root = new Array(2);
    if (right = x2 >= (xm = (x0 + x1) / 2))
      x0 = xm;
    else
      x1 = xm;
  } while ((i = +right) === (j = +(xp >= xm)));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll(data) {
  if (!Array.isArray(data))
    data = Array.from(data);
  const n = data.length;
  const xz = new Float64Array(n);
  let x0 = Infinity, x1 = -Infinity;
  for (let i = 0, x2; i < n; ++i) {
    if (isNaN(x2 = +this._x.call(null, data[i])))
      continue;
    xz[i] = x2;
    if (x2 < x0)
      x0 = x2;
    if (x2 > x1)
      x1 = x2;
  }
  if (x0 > x1)
    return this;
  this.cover(x0).cover(x1);
  for (let i = 0; i < n; ++i) {
    add(this, xz[i], data[i]);
  }
  return this;
}

// ../../../../../node_modules/d3-binarytree/src/cover.js
function cover_default(x2) {
  if (isNaN(x2 = +x2))
    return this;
  var x0 = this._x0, x1 = this._x1;
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x2)) + 1;
  } else {
    var z2 = x1 - x0 || 1, node = this._root, parent, i;
    while (x0 > x2 || x2 >= x1) {
      i = +(x2 < x0);
      parent = new Array(2), parent[i] = node, node = parent, z2 *= 2;
      switch (i) {
        case 0:
          x1 = x0 + z2;
          break;
        case 1:
          x0 = x1 - z2;
          break;
      }
    }
    if (this._root && this._root.length)
      this._root = node;
  }
  this._x0 = x0;
  this._x1 = x1;
  return this;
}

// ../../../../../node_modules/d3-binarytree/src/data.js
function data_default() {
  var data = [];
  this.visit(function(node) {
    if (!node.length)
      do
        data.push(node.data);
      while (node = node.next);
  });
  return data;
}

// ../../../../../node_modules/d3-binarytree/src/extent.js
function extent_default(_) {
  return arguments.length ? this.cover(+_[0][0]).cover(+_[1][0]) : isNaN(this._x0) ? void 0 : [[this._x0], [this._x1]];
}

// ../../../../../node_modules/d3-binarytree/src/half.js
function half_default(node, x0, x1) {
  this.node = node;
  this.x0 = x0;
  this.x1 = x1;
}

// ../../../../../node_modules/d3-binarytree/src/find.js
function find_default(x2, radius) {
  var data, x0 = this._x0, x1, x22, x3 = this._x1, halves = [], node = this._root, q, i;
  if (node)
    halves.push(new half_default(node, x0, x3));
  if (radius == null)
    radius = Infinity;
  else {
    x0 = x2 - radius;
    x3 = x2 + radius;
  }
  while (q = halves.pop()) {
    if (!(node = q.node) || (x1 = q.x0) > x3 || (x22 = q.x1) < x0)
      continue;
    if (node.length) {
      var xm = (x1 + x22) / 2;
      halves.push(
        new half_default(node[1], xm, x22),
        new half_default(node[0], x1, xm)
      );
      if (i = +(x2 >= xm)) {
        q = halves[halves.length - 1];
        halves[halves.length - 1] = halves[halves.length - 1 - i];
        halves[halves.length - 1 - i] = q;
      }
    } else {
      var d = Math.abs(x2 - +this._x.call(null, node.data));
      if (d < radius) {
        radius = d;
        x0 = x2 - d;
        x3 = x2 + d;
        data = node.data;
      }
    }
  }
  return data;
}

// ../../../../../node_modules/d3-binarytree/src/remove.js
function remove_default(d) {
  if (isNaN(x2 = +this._x.call(null, d)))
    return this;
  var parent, node = this._root, retainer, previous, next, x0 = this._x0, x1 = this._x1, x2, xm, right, i, j;
  if (!node)
    return this;
  if (node.length)
    while (true) {
      if (right = x2 >= (xm = (x0 + x1) / 2))
        x0 = xm;
      else
        x1 = xm;
      if (!(parent = node, node = node[i = +right]))
        return this;
      if (!node.length)
        break;
      if (parent[i + 1 & 1])
        retainer = parent, j = i;
    }
  while (node.data !== d)
    if (!(previous = node, node = node.next))
      return this;
  if (next = node.next)
    delete node.next;
  if (previous)
    return next ? previous.next = next : delete previous.next, this;
  if (!parent)
    return this._root = next, this;
  next ? parent[i] = next : delete parent[i];
  if ((node = parent[0] || parent[1]) && node === (parent[1] || parent[0]) && !node.length) {
    if (retainer)
      retainer[j] = node;
    else
      this._root = node;
  }
  return this;
}
function removeAll(data) {
  for (var i = 0, n = data.length; i < n; ++i)
    this.remove(data[i]);
  return this;
}

// ../../../../../node_modules/d3-binarytree/src/root.js
function root_default() {
  return this._root;
}

// ../../../../../node_modules/d3-binarytree/src/size.js
function size_default() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length)
      do
        ++size;
      while (node = node.next);
  });
  return size;
}

// ../../../../../node_modules/d3-binarytree/src/visit.js
function visit_default(callback) {
  var halves = [], q, node = this._root, child, x0, x1;
  if (node)
    halves.push(new half_default(node, this._x0, this._x1));
  while (q = halves.pop()) {
    if (!callback(node = q.node, x0 = q.x0, x1 = q.x1) && node.length) {
      var xm = (x0 + x1) / 2;
      if (child = node[1])
        halves.push(new half_default(child, xm, x1));
      if (child = node[0])
        halves.push(new half_default(child, x0, xm));
    }
  }
  return this;
}

// ../../../../../node_modules/d3-binarytree/src/visitAfter.js
function visitAfter_default(callback) {
  var halves = [], next = [], q;
  if (this._root)
    halves.push(new half_default(this._root, this._x0, this._x1));
  while (q = halves.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, x1 = q.x1, xm = (x0 + x1) / 2;
      if (child = node[0])
        halves.push(new half_default(child, x0, xm));
      if (child = node[1])
        halves.push(new half_default(child, xm, x1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.x1);
  }
  return this;
}

// ../../../../../node_modules/d3-binarytree/src/x.js
function defaultX(d) {
  return d[0];
}
function x_default(_) {
  return arguments.length ? (this._x = _, this) : this._x;
}

// ../../../../../node_modules/d3-binarytree/src/binarytree.js
function binarytree(nodes, x2) {
  var tree = new Binarytree(x2 == null ? defaultX : x2, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Binarytree(x2, x0, x1) {
  this._x = x2;
  this._x0 = x0;
  this._x1 = x1;
  this._root = void 0;
}
function leaf_copy(leaf) {
  var copy = { data: leaf.data }, next = copy;
  while (leaf = leaf.next)
    next = next.next = { data: leaf.data };
  return copy;
}
var treeProto = binarytree.prototype = Binarytree.prototype;
treeProto.copy = function() {
  var copy = new Binarytree(this._x, this._x0, this._x1), node = this._root, nodes, child;
  if (!node)
    return copy;
  if (!node.length)
    return copy._root = leaf_copy(node), copy;
  nodes = [{ source: node, target: copy._root = new Array(2) }];
  while (node = nodes.pop()) {
    for (var i = 0; i < 2; ++i) {
      if (child = node.source[i]) {
        if (child.length)
          nodes.push({ source: child, target: node.target[i] = new Array(2) });
        else
          node.target[i] = leaf_copy(child);
      }
    }
  }
  return copy;
};
treeProto.add = add_default;
treeProto.addAll = addAll;
treeProto.cover = cover_default;
treeProto.data = data_default;
treeProto.extent = extent_default;
treeProto.find = find_default;
treeProto.remove = remove_default;
treeProto.removeAll = removeAll;
treeProto.root = root_default;
treeProto.size = size_default;
treeProto.visit = visit_default;
treeProto.visitAfter = visitAfter_default;
treeProto.x = x_default;

// ../../../../../node_modules/d3-quadtree/src/add.js
function add_default2(d) {
  const x2 = +this._x.call(null, d), y2 = +this._y.call(null, d);
  return add2(this.cover(x2, y2), x2, y2, d);
}
function add2(tree, x2, y2, d) {
  if (isNaN(x2) || isNaN(y2))
    return tree;
  var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, y0 = tree._y0, x1 = tree._x1, y1 = tree._y1, xm, ym, xp, yp, right, bottom, i, j;
  if (!node)
    return tree._root = leaf, tree;
  while (node.length) {
    if (right = x2 >= (xm = (x0 + x1) / 2))
      x0 = xm;
    else
      x1 = xm;
    if (bottom = y2 >= (ym = (y0 + y1) / 2))
      y0 = ym;
    else
      y1 = ym;
    if (parent = node, !(node = node[i = bottom << 1 | right]))
      return parent[i] = leaf, tree;
  }
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  if (x2 === xp && y2 === yp)
    return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  do {
    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
    if (right = x2 >= (xm = (x0 + x1) / 2))
      x0 = xm;
    else
      x1 = xm;
    if (bottom = y2 >= (ym = (y0 + y1) / 2))
      y0 = ym;
    else
      y1 = ym;
  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | xp >= xm));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll2(data) {
  var d, i, n = data.length, x2, y2, xz = new Array(n), yz = new Array(n), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (i = 0; i < n; ++i) {
    if (isNaN(x2 = +this._x.call(null, d = data[i])) || isNaN(y2 = +this._y.call(null, d)))
      continue;
    xz[i] = x2;
    yz[i] = y2;
    if (x2 < x0)
      x0 = x2;
    if (x2 > x1)
      x1 = x2;
    if (y2 < y0)
      y0 = y2;
    if (y2 > y1)
      y1 = y2;
  }
  if (x0 > x1 || y0 > y1)
    return this;
  this.cover(x0, y0).cover(x1, y1);
  for (i = 0; i < n; ++i) {
    add2(this, xz[i], yz[i], data[i]);
  }
  return this;
}

// ../../../../../node_modules/d3-quadtree/src/cover.js
function cover_default2(x2, y2) {
  if (isNaN(x2 = +x2) || isNaN(y2 = +y2))
    return this;
  var x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1;
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x2)) + 1;
    y1 = (y0 = Math.floor(y2)) + 1;
  } else {
    var z2 = x1 - x0 || 1, node = this._root, parent, i;
    while (x0 > x2 || x2 >= x1 || y0 > y2 || y2 >= y1) {
      i = (y2 < y0) << 1 | x2 < x0;
      parent = new Array(4), parent[i] = node, node = parent, z2 *= 2;
      switch (i) {
        case 0:
          x1 = x0 + z2, y1 = y0 + z2;
          break;
        case 1:
          x0 = x1 - z2, y1 = y0 + z2;
          break;
        case 2:
          x1 = x0 + z2, y0 = y1 - z2;
          break;
        case 3:
          x0 = x1 - z2, y0 = y1 - z2;
          break;
      }
    }
    if (this._root && this._root.length)
      this._root = node;
  }
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  return this;
}

// ../../../../../node_modules/d3-quadtree/src/data.js
function data_default2() {
  var data = [];
  this.visit(function(node) {
    if (!node.length)
      do
        data.push(node.data);
      while (node = node.next);
  });
  return data;
}

// ../../../../../node_modules/d3-quadtree/src/extent.js
function extent_default2(_) {
  return arguments.length ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
}

// ../../../../../node_modules/d3-quadtree/src/quad.js
function quad_default(node, x0, y0, x1, y1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
}

// ../../../../../node_modules/d3-quadtree/src/find.js
function find_default2(x2, y2, radius) {
  var data, x0 = this._x0, y0 = this._y0, x1, y1, x22, y22, x3 = this._x1, y3 = this._y1, quads = [], node = this._root, q, i;
  if (node)
    quads.push(new quad_default(node, x0, y0, x3, y3));
  if (radius == null)
    radius = Infinity;
  else {
    x0 = x2 - radius, y0 = y2 - radius;
    x3 = x2 + radius, y3 = y2 + radius;
    radius *= radius;
  }
  while (q = quads.pop()) {
    if (!(node = q.node) || (x1 = q.x0) > x3 || (y1 = q.y0) > y3 || (x22 = q.x1) < x0 || (y22 = q.y1) < y0)
      continue;
    if (node.length) {
      var xm = (x1 + x22) / 2, ym = (y1 + y22) / 2;
      quads.push(
        new quad_default(node[3], xm, ym, x22, y22),
        new quad_default(node[2], x1, ym, xm, y22),
        new quad_default(node[1], xm, y1, x22, ym),
        new quad_default(node[0], x1, y1, xm, ym)
      );
      if (i = (y2 >= ym) << 1 | x2 >= xm) {
        q = quads[quads.length - 1];
        quads[quads.length - 1] = quads[quads.length - 1 - i];
        quads[quads.length - 1 - i] = q;
      }
    } else {
      var dx = x2 - +this._x.call(null, node.data), dy = y2 - +this._y.call(null, node.data), d2 = dx * dx + dy * dy;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x0 = x2 - d, y0 = y2 - d;
        x3 = x2 + d, y3 = y2 + d;
        data = node.data;
      }
    }
  }
  return data;
}

// ../../../../../node_modules/d3-quadtree/src/remove.js
function remove_default2(d) {
  if (isNaN(x2 = +this._x.call(null, d)) || isNaN(y2 = +this._y.call(null, d)))
    return this;
  var parent, node = this._root, retainer, previous, next, x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1, x2, y2, xm, ym, right, bottom, i, j;
  if (!node)
    return this;
  if (node.length)
    while (true) {
      if (right = x2 >= (xm = (x0 + x1) / 2))
        x0 = xm;
      else
        x1 = xm;
      if (bottom = y2 >= (ym = (y0 + y1) / 2))
        y0 = ym;
      else
        y1 = ym;
      if (!(parent = node, node = node[i = bottom << 1 | right]))
        return this;
      if (!node.length)
        break;
      if (parent[i + 1 & 3] || parent[i + 2 & 3] || parent[i + 3 & 3])
        retainer = parent, j = i;
    }
  while (node.data !== d)
    if (!(previous = node, node = node.next))
      return this;
  if (next = node.next)
    delete node.next;
  if (previous)
    return next ? previous.next = next : delete previous.next, this;
  if (!parent)
    return this._root = next, this;
  next ? parent[i] = next : delete parent[i];
  if ((node = parent[0] || parent[1] || parent[2] || parent[3]) && node === (parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) {
    if (retainer)
      retainer[j] = node;
    else
      this._root = node;
  }
  return this;
}
function removeAll2(data) {
  for (var i = 0, n = data.length; i < n; ++i)
    this.remove(data[i]);
  return this;
}

// ../../../../../node_modules/d3-quadtree/src/root.js
function root_default2() {
  return this._root;
}

// ../../../../../node_modules/d3-quadtree/src/size.js
function size_default2() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length)
      do
        ++size;
      while (node = node.next);
  });
  return size;
}

// ../../../../../node_modules/d3-quadtree/src/visit.js
function visit_default2(callback) {
  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
  if (node)
    quads.push(new quad_default(node, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[3])
        quads.push(new quad_default(child, xm, ym, x1, y1));
      if (child = node[2])
        quads.push(new quad_default(child, x0, ym, xm, y1));
      if (child = node[1])
        quads.push(new quad_default(child, xm, y0, x1, ym));
      if (child = node[0])
        quads.push(new quad_default(child, x0, y0, xm, ym));
    }
  }
  return this;
}

// ../../../../../node_modules/d3-quadtree/src/visitAfter.js
function visitAfter_default2(callback) {
  var quads = [], next = [], q;
  if (this._root)
    quads.push(new quad_default(this._root, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[0])
        quads.push(new quad_default(child, x0, y0, xm, ym));
      if (child = node[1])
        quads.push(new quad_default(child, xm, y0, x1, ym));
      if (child = node[2])
        quads.push(new quad_default(child, x0, ym, xm, y1));
      if (child = node[3])
        quads.push(new quad_default(child, xm, ym, x1, y1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
  return this;
}

// ../../../../../node_modules/d3-quadtree/src/x.js
function defaultX2(d) {
  return d[0];
}
function x_default2(_) {
  return arguments.length ? (this._x = _, this) : this._x;
}

// ../../../../../node_modules/d3-quadtree/src/y.js
function defaultY(d) {
  return d[1];
}
function y_default(_) {
  return arguments.length ? (this._y = _, this) : this._y;
}

// ../../../../../node_modules/d3-quadtree/src/quadtree.js
function quadtree(nodes, x2, y2) {
  var tree = new Quadtree(x2 == null ? defaultX2 : x2, y2 == null ? defaultY : y2, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Quadtree(x2, y2, x0, y0, x1, y1) {
  this._x = x2;
  this._y = y2;
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  this._root = void 0;
}
function leaf_copy2(leaf) {
  var copy = { data: leaf.data }, next = copy;
  while (leaf = leaf.next)
    next = next.next = { data: leaf.data };
  return copy;
}
var treeProto2 = quadtree.prototype = Quadtree.prototype;
treeProto2.copy = function() {
  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1), node = this._root, nodes, child;
  if (!node)
    return copy;
  if (!node.length)
    return copy._root = leaf_copy2(node), copy;
  nodes = [{ source: node, target: copy._root = new Array(4) }];
  while (node = nodes.pop()) {
    for (var i = 0; i < 4; ++i) {
      if (child = node.source[i]) {
        if (child.length)
          nodes.push({ source: child, target: node.target[i] = new Array(4) });
        else
          node.target[i] = leaf_copy2(child);
      }
    }
  }
  return copy;
};
treeProto2.add = add_default2;
treeProto2.addAll = addAll2;
treeProto2.cover = cover_default2;
treeProto2.data = data_default2;
treeProto2.extent = extent_default2;
treeProto2.find = find_default2;
treeProto2.remove = remove_default2;
treeProto2.removeAll = removeAll2;
treeProto2.root = root_default2;
treeProto2.size = size_default2;
treeProto2.visit = visit_default2;
treeProto2.visitAfter = visitAfter_default2;
treeProto2.x = x_default2;
treeProto2.y = y_default;

// ../../../../../node_modules/d3-octree/src/add.js
function add_default3(d) {
  const x2 = +this._x.call(null, d), y2 = +this._y.call(null, d), z2 = +this._z.call(null, d);
  return add3(this.cover(x2, y2, z2), x2, y2, z2, d);
}
function add3(tree, x2, y2, z2, d) {
  if (isNaN(x2) || isNaN(y2) || isNaN(z2))
    return tree;
  var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, y0 = tree._y0, z0 = tree._z0, x1 = tree._x1, y1 = tree._y1, z1 = tree._z1, xm, ym, zm, xp, yp, zp, right, bottom, deep, i, j;
  if (!node)
    return tree._root = leaf, tree;
  while (node.length) {
    if (right = x2 >= (xm = (x0 + x1) / 2))
      x0 = xm;
    else
      x1 = xm;
    if (bottom = y2 >= (ym = (y0 + y1) / 2))
      y0 = ym;
    else
      y1 = ym;
    if (deep = z2 >= (zm = (z0 + z1) / 2))
      z0 = zm;
    else
      z1 = zm;
    if (parent = node, !(node = node[i = deep << 2 | bottom << 1 | right]))
      return parent[i] = leaf, tree;
  }
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  zp = +tree._z.call(null, node.data);
  if (x2 === xp && y2 === yp && z2 === zp)
    return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  do {
    parent = parent ? parent[i] = new Array(8) : tree._root = new Array(8);
    if (right = x2 >= (xm = (x0 + x1) / 2))
      x0 = xm;
    else
      x1 = xm;
    if (bottom = y2 >= (ym = (y0 + y1) / 2))
      y0 = ym;
    else
      y1 = ym;
    if (deep = z2 >= (zm = (z0 + z1) / 2))
      z0 = zm;
    else
      z1 = zm;
  } while ((i = deep << 2 | bottom << 1 | right) === (j = (zp >= zm) << 2 | (yp >= ym) << 1 | xp >= xm));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll3(data) {
  if (!Array.isArray(data))
    data = Array.from(data);
  const n = data.length;
  const xz = new Float64Array(n);
  const yz = new Float64Array(n);
  const zz = new Float64Array(n);
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0, d, x2, y2, z2; i < n; ++i) {
    if (isNaN(x2 = +this._x.call(null, d = data[i])) || isNaN(y2 = +this._y.call(null, d)) || isNaN(z2 = +this._z.call(null, d)))
      continue;
    xz[i] = x2;
    yz[i] = y2;
    zz[i] = z2;
    if (x2 < x0)
      x0 = x2;
    if (x2 > x1)
      x1 = x2;
    if (y2 < y0)
      y0 = y2;
    if (y2 > y1)
      y1 = y2;
    if (z2 < z0)
      z0 = z2;
    if (z2 > z1)
      z1 = z2;
  }
  if (x0 > x1 || y0 > y1 || z0 > z1)
    return this;
  this.cover(x0, y0, z0).cover(x1, y1, z1);
  for (let i = 0; i < n; ++i) {
    add3(this, xz[i], yz[i], zz[i], data[i]);
  }
  return this;
}

// ../../../../../node_modules/d3-octree/src/cover.js
function cover_default3(x2, y2, z2) {
  if (isNaN(x2 = +x2) || isNaN(y2 = +y2) || isNaN(z2 = +z2))
    return this;
  var x0 = this._x0, y0 = this._y0, z0 = this._z0, x1 = this._x1, y1 = this._y1, z1 = this._z1;
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x2)) + 1;
    y1 = (y0 = Math.floor(y2)) + 1;
    z1 = (z0 = Math.floor(z2)) + 1;
  } else {
    var t = x1 - x0 || 1, node = this._root, parent, i;
    while (x0 > x2 || x2 >= x1 || y0 > y2 || y2 >= y1 || z0 > z2 || z2 >= z1) {
      i = (z2 < z0) << 2 | (y2 < y0) << 1 | x2 < x0;
      parent = new Array(8), parent[i] = node, node = parent, t *= 2;
      switch (i) {
        case 0:
          x1 = x0 + t, y1 = y0 + t, z1 = z0 + t;
          break;
        case 1:
          x0 = x1 - t, y1 = y0 + t, z1 = z0 + t;
          break;
        case 2:
          x1 = x0 + t, y0 = y1 - t, z1 = z0 + t;
          break;
        case 3:
          x0 = x1 - t, y0 = y1 - t, z1 = z0 + t;
          break;
        case 4:
          x1 = x0 + t, y1 = y0 + t, z0 = z1 - t;
          break;
        case 5:
          x0 = x1 - t, y1 = y0 + t, z0 = z1 - t;
          break;
        case 6:
          x1 = x0 + t, y0 = y1 - t, z0 = z1 - t;
          break;
        case 7:
          x0 = x1 - t, y0 = y1 - t, z0 = z1 - t;
          break;
      }
    }
    if (this._root && this._root.length)
      this._root = node;
  }
  this._x0 = x0;
  this._y0 = y0;
  this._z0 = z0;
  this._x1 = x1;
  this._y1 = y1;
  this._z1 = z1;
  return this;
}

// ../../../../../node_modules/d3-octree/src/data.js
function data_default3() {
  var data = [];
  this.visit(function(node) {
    if (!node.length)
      do
        data.push(node.data);
      while (node = node.next);
  });
  return data;
}

// ../../../../../node_modules/d3-octree/src/extent.js
function extent_default3(_) {
  return arguments.length ? this.cover(+_[0][0], +_[0][1], +_[0][2]).cover(+_[1][0], +_[1][1], +_[1][2]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0, this._z0], [this._x1, this._y1, this._z1]];
}

// ../../../../../node_modules/d3-octree/src/octant.js
function octant_default(node, x0, y0, z0, x1, y1, z1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.z0 = z0;
  this.x1 = x1;
  this.y1 = y1;
  this.z1 = z1;
}

// ../../../../../node_modules/d3-octree/src/find.js
function find_default3(x2, y2, z2, radius) {
  var data, x0 = this._x0, y0 = this._y0, z0 = this._z0, x1, y1, z1, x22, y22, z22, x3 = this._x1, y3 = this._y1, z3 = this._z1, octs = [], node = this._root, q, i;
  if (node)
    octs.push(new octant_default(node, x0, y0, z0, x3, y3, z3));
  if (radius == null)
    radius = Infinity;
  else {
    x0 = x2 - radius, y0 = y2 - radius, z0 = z2 - radius;
    x3 = x2 + radius, y3 = y2 + radius, z3 = z2 + radius;
    radius *= radius;
  }
  while (q = octs.pop()) {
    if (!(node = q.node) || (x1 = q.x0) > x3 || (y1 = q.y0) > y3 || (z1 = q.z0) > z3 || (x22 = q.x1) < x0 || (y22 = q.y1) < y0 || (z22 = q.z1) < z0)
      continue;
    if (node.length) {
      var xm = (x1 + x22) / 2, ym = (y1 + y22) / 2, zm = (z1 + z22) / 2;
      octs.push(
        new octant_default(node[7], xm, ym, zm, x22, y22, z22),
        new octant_default(node[6], x1, ym, zm, xm, y22, z22),
        new octant_default(node[5], xm, y1, zm, x22, ym, z22),
        new octant_default(node[4], x1, y1, zm, xm, ym, z22),
        new octant_default(node[3], xm, ym, z1, x22, y22, zm),
        new octant_default(node[2], x1, ym, z1, xm, y22, zm),
        new octant_default(node[1], xm, y1, z1, x22, ym, zm),
        new octant_default(node[0], x1, y1, z1, xm, ym, zm)
      );
      if (i = (z2 >= zm) << 2 | (y2 >= ym) << 1 | x2 >= xm) {
        q = octs[octs.length - 1];
        octs[octs.length - 1] = octs[octs.length - 1 - i];
        octs[octs.length - 1 - i] = q;
      }
    } else {
      var dx = x2 - +this._x.call(null, node.data), dy = y2 - +this._y.call(null, node.data), dz = z2 - +this._z.call(null, node.data), d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x0 = x2 - d, y0 = y2 - d, z0 = z2 - d;
        x3 = x2 + d, y3 = y2 + d, z3 = z2 + d;
        data = node.data;
      }
    }
  }
  return data;
}

// ../../../../../node_modules/d3-octree/src/findAll.js
var distance = (x1, y1, z1, x2, y2, z2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2);
function findAllWithinRadius(x2, y2, z2, radius) {
  const result = [];
  const xMin = x2 - radius;
  const yMin = y2 - radius;
  const zMin = z2 - radius;
  const xMax = x2 + radius;
  const yMax = y2 + radius;
  const zMax = z2 + radius;
  this.visit((node, x1, y1, z1, x22, y22, z22) => {
    if (!node.length) {
      do {
        const d = node.data;
        if (distance(x2, y2, z2, this._x(d), this._y(d), this._z(d)) <= radius) {
          result.push(d);
        }
      } while (node = node.next);
    }
    return x1 > xMax || y1 > yMax || z1 > zMax || x22 < xMin || y22 < yMin || z22 < zMin;
  });
  return result;
}

// ../../../../../node_modules/d3-octree/src/remove.js
function remove_default3(d) {
  if (isNaN(x2 = +this._x.call(null, d)) || isNaN(y2 = +this._y.call(null, d)) || isNaN(z2 = +this._z.call(null, d)))
    return this;
  var parent, node = this._root, retainer, previous, next, x0 = this._x0, y0 = this._y0, z0 = this._z0, x1 = this._x1, y1 = this._y1, z1 = this._z1, x2, y2, z2, xm, ym, zm, right, bottom, deep, i, j;
  if (!node)
    return this;
  if (node.length)
    while (true) {
      if (right = x2 >= (xm = (x0 + x1) / 2))
        x0 = xm;
      else
        x1 = xm;
      if (bottom = y2 >= (ym = (y0 + y1) / 2))
        y0 = ym;
      else
        y1 = ym;
      if (deep = z2 >= (zm = (z0 + z1) / 2))
        z0 = zm;
      else
        z1 = zm;
      if (!(parent = node, node = node[i = deep << 2 | bottom << 1 | right]))
        return this;
      if (!node.length)
        break;
      if (parent[i + 1 & 7] || parent[i + 2 & 7] || parent[i + 3 & 7] || parent[i + 4 & 7] || parent[i + 5 & 7] || parent[i + 6 & 7] || parent[i + 7 & 7])
        retainer = parent, j = i;
    }
  while (node.data !== d)
    if (!(previous = node, node = node.next))
      return this;
  if (next = node.next)
    delete node.next;
  if (previous)
    return next ? previous.next = next : delete previous.next, this;
  if (!parent)
    return this._root = next, this;
  next ? parent[i] = next : delete parent[i];
  if ((node = parent[0] || parent[1] || parent[2] || parent[3] || parent[4] || parent[5] || parent[6] || parent[7]) && node === (parent[7] || parent[6] || parent[5] || parent[4] || parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) {
    if (retainer)
      retainer[j] = node;
    else
      this._root = node;
  }
  return this;
}
function removeAll3(data) {
  for (var i = 0, n = data.length; i < n; ++i)
    this.remove(data[i]);
  return this;
}

// ../../../../../node_modules/d3-octree/src/root.js
function root_default3() {
  return this._root;
}

// ../../../../../node_modules/d3-octree/src/size.js
function size_default3() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length)
      do
        ++size;
      while (node = node.next);
  });
  return size;
}

// ../../../../../node_modules/d3-octree/src/visit.js
function visit_default3(callback) {
  var octs = [], q, node = this._root, child, x0, y0, z0, x1, y1, z1;
  if (node)
    octs.push(new octant_default(node, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
  while (q = octs.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1) && node.length) {
      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
      if (child = node[7])
        octs.push(new octant_default(child, xm, ym, zm, x1, y1, z1));
      if (child = node[6])
        octs.push(new octant_default(child, x0, ym, zm, xm, y1, z1));
      if (child = node[5])
        octs.push(new octant_default(child, xm, y0, zm, x1, ym, z1));
      if (child = node[4])
        octs.push(new octant_default(child, x0, y0, zm, xm, ym, z1));
      if (child = node[3])
        octs.push(new octant_default(child, xm, ym, z0, x1, y1, zm));
      if (child = node[2])
        octs.push(new octant_default(child, x0, ym, z0, xm, y1, zm));
      if (child = node[1])
        octs.push(new octant_default(child, xm, y0, z0, x1, ym, zm));
      if (child = node[0])
        octs.push(new octant_default(child, x0, y0, z0, xm, ym, zm));
    }
  }
  return this;
}

// ../../../../../node_modules/d3-octree/src/visitAfter.js
function visitAfter_default3(callback) {
  var octs = [], next = [], q;
  if (this._root)
    octs.push(new octant_default(this._root, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
  while (q = octs.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
      if (child = node[0])
        octs.push(new octant_default(child, x0, y0, z0, xm, ym, zm));
      if (child = node[1])
        octs.push(new octant_default(child, xm, y0, z0, x1, ym, zm));
      if (child = node[2])
        octs.push(new octant_default(child, x0, ym, z0, xm, y1, zm));
      if (child = node[3])
        octs.push(new octant_default(child, xm, ym, z0, x1, y1, zm));
      if (child = node[4])
        octs.push(new octant_default(child, x0, y0, zm, xm, ym, z1));
      if (child = node[5])
        octs.push(new octant_default(child, xm, y0, zm, x1, ym, z1));
      if (child = node[6])
        octs.push(new octant_default(child, x0, ym, zm, xm, y1, z1));
      if (child = node[7])
        octs.push(new octant_default(child, xm, ym, zm, x1, y1, z1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.z0, q.x1, q.y1, q.z1);
  }
  return this;
}

// ../../../../../node_modules/d3-octree/src/x.js
function defaultX3(d) {
  return d[0];
}
function x_default3(_) {
  return arguments.length ? (this._x = _, this) : this._x;
}

// ../../../../../node_modules/d3-octree/src/y.js
function defaultY2(d) {
  return d[1];
}
function y_default2(_) {
  return arguments.length ? (this._y = _, this) : this._y;
}

// ../../../../../node_modules/d3-octree/src/z.js
function defaultZ(d) {
  return d[2];
}
function z_default(_) {
  return arguments.length ? (this._z = _, this) : this._z;
}

// ../../../../../node_modules/d3-octree/src/octree.js
function octree(nodes, x2, y2, z2) {
  var tree = new Octree(x2 == null ? defaultX3 : x2, y2 == null ? defaultY2 : y2, z2 == null ? defaultZ : z2, NaN, NaN, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Octree(x2, y2, z2, x0, y0, z0, x1, y1, z1) {
  this._x = x2;
  this._y = y2;
  this._z = z2;
  this._x0 = x0;
  this._y0 = y0;
  this._z0 = z0;
  this._x1 = x1;
  this._y1 = y1;
  this._z1 = z1;
  this._root = void 0;
}
function leaf_copy3(leaf) {
  var copy = { data: leaf.data }, next = copy;
  while (leaf = leaf.next)
    next = next.next = { data: leaf.data };
  return copy;
}
var treeProto3 = octree.prototype = Octree.prototype;
treeProto3.copy = function() {
  var copy = new Octree(this._x, this._y, this._z, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1), node = this._root, nodes, child;
  if (!node)
    return copy;
  if (!node.length)
    return copy._root = leaf_copy3(node), copy;
  nodes = [{ source: node, target: copy._root = new Array(8) }];
  while (node = nodes.pop()) {
    for (var i = 0; i < 8; ++i) {
      if (child = node.source[i]) {
        if (child.length)
          nodes.push({ source: child, target: node.target[i] = new Array(8) });
        else
          node.target[i] = leaf_copy3(child);
      }
    }
  }
  return copy;
};
treeProto3.add = add_default3;
treeProto3.addAll = addAll3;
treeProto3.cover = cover_default3;
treeProto3.data = data_default3;
treeProto3.extent = extent_default3;
treeProto3.find = find_default3;
treeProto3.findAllWithinRadius = findAllWithinRadius;
treeProto3.remove = remove_default3;
treeProto3.removeAll = removeAll3;
treeProto3.root = root_default3;
treeProto3.size = size_default3;
treeProto3.visit = visit_default3;
treeProto3.visitAfter = visitAfter_default3;
treeProto3.x = x_default3;
treeProto3.y = y_default2;
treeProto3.z = z_default;

// ../../../../../node_modules/d3-force-3d/src/constant.js
function constant_default(x2) {
  return function() {
    return x2;
  };
}

// ../../../../../node_modules/d3-force-3d/src/jiggle.js
function jiggle_default(random) {
  return (random() - 0.5) * 1e-6;
}

// ../../../../../node_modules/d3-force-3d/src/link.js
function index(d) {
  return d.index;
}
function find(nodeById, nodeId) {
  var node = nodeById.get(nodeId);
  if (!node)
    throw new Error("node not found: " + nodeId);
  return node;
}
function link_default(links) {
  var id = index, strength = defaultStrength, strengths, distance2 = constant_default(30), distances, nodes, nDim, count, bias, random, iterations = 1;
  if (links == null)
    links = [];
  function defaultStrength(link) {
    return 1 / Math.min(count[link.source.index], count[link.target.index]);
  }
  function force(alpha) {
    for (var k = 0, n = links.length; k < iterations; ++k) {
      for (var i = 0, link, source, target, x2 = 0, y2 = 0, z2 = 0, l, b; i < n; ++i) {
        link = links[i], source = link.source, target = link.target;
        x2 = target.x + target.vx - source.x - source.vx || jiggle_default(random);
        if (nDim > 1) {
          y2 = target.y + target.vy - source.y - source.vy || jiggle_default(random);
        }
        if (nDim > 2) {
          z2 = target.z + target.vz - source.z - source.vz || jiggle_default(random);
        }
        l = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2);
        l = (l - distances[i]) / l * alpha * strengths[i];
        x2 *= l, y2 *= l, z2 *= l;
        target.vx -= x2 * (b = bias[i]);
        if (nDim > 1) {
          target.vy -= y2 * b;
        }
        if (nDim > 2) {
          target.vz -= z2 * b;
        }
        source.vx += x2 * (b = 1 - b);
        if (nDim > 1) {
          source.vy += y2 * b;
        }
        if (nDim > 2) {
          source.vz += z2 * b;
        }
      }
    }
  }
  function initialize() {
    if (!nodes)
      return;
    var i, n = nodes.length, m2 = links.length, nodeById = new Map(nodes.map((d, i2) => [id(d, i2, nodes), d])), link;
    for (i = 0, count = new Array(n); i < m2; ++i) {
      link = links[i], link.index = i;
      if (typeof link.source !== "object")
        link.source = find(nodeById, link.source);
      if (typeof link.target !== "object")
        link.target = find(nodeById, link.target);
      count[link.source.index] = (count[link.source.index] || 0) + 1;
      count[link.target.index] = (count[link.target.index] || 0) + 1;
    }
    for (i = 0, bias = new Array(m2); i < m2; ++i) {
      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
    }
    strengths = new Array(m2), initializeStrength();
    distances = new Array(m2), initializeDistance();
  }
  function initializeStrength() {
    if (!nodes)
      return;
    for (var i = 0, n = links.length; i < n; ++i) {
      strengths[i] = +strength(links[i], i, links);
    }
  }
  function initializeDistance() {
    if (!nodes)
      return;
    for (var i = 0, n = links.length; i < n; ++i) {
      distances[i] = +distance2(links[i], i, links);
    }
  }
  force.initialize = function(_nodes, ...args) {
    nodes = _nodes;
    random = args.find((arg) => typeof arg === "function") || Math.random;
    nDim = args.find((arg) => [1, 2, 3].includes(arg)) || 2;
    initialize();
  };
  force.links = function(_) {
    return arguments.length ? (links = _, initialize(), force) : links;
  };
  force.id = function(_) {
    return arguments.length ? (id = _, force) : id;
  };
  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default(+_), initializeStrength(), force) : strength;
  };
  force.distance = function(_) {
    return arguments.length ? (distance2 = typeof _ === "function" ? _ : constant_default(+_), initializeDistance(), force) : distance2;
  };
  return force;
}

// ../../../../../node_modules/d3-dispatch/src/dispatch.js
var noop = { value: () => {
} };
function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t))
      throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}
function Dispatch(_) {
  this._ = _;
}
function parseTypenames(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0)
      name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t))
      throw new Error("unknown type: " + t);
    return { type: t, name };
  });
}
Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
    if (arguments.length < 2) {
      while (++i < n)
        if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name)))
          return t;
      return;
    }
    if (callback != null && typeof callback !== "function")
      throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type)
        _[t] = set(_[t], typename.name, callback);
      else if (callback == null)
        for (t in _)
          _[t] = set(_[t], typename.name, null);
    }
    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _)
      copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0)
      for (var args = new Array(n), i = 0, n, t; i < n; ++i)
        args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type))
      throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i)
      t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type))
      throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i)
      t[i].value.apply(that, args);
  }
};
function get(type, name) {
  for (var i = 0, n = type.length, c2; i < n; ++i) {
    if ((c2 = type[i]).name === name) {
      return c2.value;
    }
  }
}
function set(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null)
    type.push({ name, value: callback });
  return type;
}
var dispatch_default = dispatch;

// ../../../../../node_modules/d3-timer/src/timer.js
var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1e3;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
  setTimeout(f, 17);
};
function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}
function clearNow() {
  clockNow = 0;
}
function Timer() {
  this._call = this._time = this._next = null;
}
Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function")
      throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail)
        taskTail._next = this;
      else
        taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};
function timer(callback, delay, time) {
  var t = new Timer();
  t.restart(callback, delay, time);
  return t;
}
function timerFlush() {
  now();
  ++frame;
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0)
      t._call.call(void 0, e);
    t = t._next;
  }
  --frame;
}
function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}
function poke() {
  var now2 = clock.now(), delay = now2 - clockLast;
  if (delay > pokeDelay)
    clockSkew -= delay, clockLast = now2;
}
function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time)
        time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}
function sleep(time) {
  if (frame)
    return;
  if (timeout)
    timeout = clearTimeout(timeout);
  var delay = time - clockNow;
  if (delay > 24) {
    if (time < Infinity)
      timeout = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval)
      interval = clearInterval(interval);
  } else {
    if (!interval)
      clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

// ../../../../../node_modules/d3-force-3d/src/lcg.js
var a = 1664525;
var c = 1013904223;
var m = 4294967296;
function lcg_default() {
  let s = 1;
  return () => (s = (a * s + c) % m) / m;
}

// ../../../../../node_modules/d3-force-3d/src/simulation.js
var MAX_DIMENSIONS = 3;
function x(d) {
  return d.x;
}
function y(d) {
  return d.y;
}
function z(d) {
  return d.z;
}
var initialRadius = 10;
var initialAngleRoll = Math.PI * (3 - Math.sqrt(5));
var initialAngleYaw = Math.PI * 20 / (9 + Math.sqrt(221));
function simulation_default(nodes, numDimensions) {
  numDimensions = numDimensions || 2;
  var nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(numDimensions))), simulation, alpha = 1, alphaMin = 1e-3, alphaDecay = 1 - Math.pow(alphaMin, 1 / 300), alphaTarget = 0, velocityDecay = 0.6, forces = /* @__PURE__ */ new Map(), stepper = timer(step), event = dispatch_default("tick", "end"), random = lcg_default();
  if (nodes == null)
    nodes = [];
  function step() {
    tick();
    event.call("tick", simulation);
    if (alpha < alphaMin) {
      stepper.stop();
      event.call("end", simulation);
    }
  }
  function tick(iterations) {
    var i, n = nodes.length, node;
    if (iterations === void 0)
      iterations = 1;
    for (var k = 0; k < iterations; ++k) {
      alpha += (alphaTarget - alpha) * alphaDecay;
      forces.forEach(function(force) {
        force(alpha);
      });
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        if (node.fx == null)
          node.x += node.vx *= velocityDecay;
        else
          node.x = node.fx, node.vx = 0;
        if (nDim > 1) {
          if (node.fy == null)
            node.y += node.vy *= velocityDecay;
          else
            node.y = node.fy, node.vy = 0;
        }
        if (nDim > 2) {
          if (node.fz == null)
            node.z += node.vz *= velocityDecay;
          else
            node.z = node.fz, node.vz = 0;
        }
      }
    }
    return simulation;
  }
  function initializeNodes() {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.index = i;
      if (node.fx != null)
        node.x = node.fx;
      if (node.fy != null)
        node.y = node.fy;
      if (node.fz != null)
        node.z = node.fz;
      if (isNaN(node.x) || nDim > 1 && isNaN(node.y) || nDim > 2 && isNaN(node.z)) {
        var radius = initialRadius * (nDim > 2 ? Math.cbrt(0.5 + i) : nDim > 1 ? Math.sqrt(0.5 + i) : i), rollAngle = i * initialAngleRoll, yawAngle = i * initialAngleYaw;
        if (nDim === 1) {
          node.x = radius;
        } else if (nDim === 2) {
          node.x = radius * Math.cos(rollAngle);
          node.y = radius * Math.sin(rollAngle);
        } else {
          node.x = radius * Math.sin(rollAngle) * Math.cos(yawAngle);
          node.y = radius * Math.cos(rollAngle);
          node.z = radius * Math.sin(rollAngle) * Math.sin(yawAngle);
        }
      }
      if (isNaN(node.vx) || nDim > 1 && isNaN(node.vy) || nDim > 2 && isNaN(node.vz)) {
        node.vx = 0;
        if (nDim > 1) {
          node.vy = 0;
        }
        if (nDim > 2) {
          node.vz = 0;
        }
      }
    }
  }
  function initializeForce(force) {
    if (force.initialize)
      force.initialize(nodes, random, nDim);
    return force;
  }
  initializeNodes();
  return simulation = {
    tick,
    restart: function() {
      return stepper.restart(step), simulation;
    },
    stop: function() {
      return stepper.stop(), simulation;
    },
    numDimensions: function(_) {
      return arguments.length ? (nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(_))), forces.forEach(initializeForce), simulation) : nDim;
    },
    nodes: function(_) {
      return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
    },
    alpha: function(_) {
      return arguments.length ? (alpha = +_, simulation) : alpha;
    },
    alphaMin: function(_) {
      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
    },
    alphaDecay: function(_) {
      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
    },
    alphaTarget: function(_) {
      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
    },
    velocityDecay: function(_) {
      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
    },
    randomSource: function(_) {
      return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
    },
    force: function(name, _) {
      return arguments.length > 1 ? (_ == null ? forces.delete(name) : forces.set(name, initializeForce(_)), simulation) : forces.get(name);
    },
    find: function() {
      var args = Array.prototype.slice.call(arguments);
      var x2 = args.shift() || 0, y2 = (nDim > 1 ? args.shift() : null) || 0, z2 = (nDim > 2 ? args.shift() : null) || 0, radius = args.shift() || Infinity;
      var i = 0, n = nodes.length, dx, dy, dz, d2, node, closest;
      radius *= radius;
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        dx = x2 - node.x;
        dy = y2 - (node.y || 0);
        dz = z2 - (node.z || 0);
        d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < radius)
          closest = node, radius = d2;
      }
      return closest;
    },
    on: function(name, _) {
      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
    }
  };
}

// ../../../../../node_modules/d3-force-3d/src/manyBody.js
function manyBody_default() {
  var nodes, nDim, node, random, alpha, strength = constant_default(-30), strengths, distanceMin2 = 1, distanceMax2 = Infinity, theta2 = 0.81;
  function force(_) {
    var i, n = nodes.length, tree = (nDim === 1 ? binarytree(nodes, x) : nDim === 2 ? quadtree(nodes, x, y) : nDim === 3 ? octree(nodes, x, y, z) : null).visitAfter(accumulate);
    for (alpha = _, i = 0; i < n; ++i)
      node = nodes[i], tree.visit(apply);
  }
  function initialize() {
    if (!nodes)
      return;
    var i, n = nodes.length, node2;
    strengths = new Array(n);
    for (i = 0; i < n; ++i)
      node2 = nodes[i], strengths[node2.index] = +strength(node2, i, nodes);
  }
  function accumulate(treeNode) {
    var strength2 = 0, q, c2, weight = 0, x2, y2, z2, i;
    var numChildren = treeNode.length;
    if (numChildren) {
      for (x2 = y2 = z2 = i = 0; i < numChildren; ++i) {
        if ((q = treeNode[i]) && (c2 = Math.abs(q.value))) {
          strength2 += q.value, weight += c2, x2 += c2 * (q.x || 0), y2 += c2 * (q.y || 0), z2 += c2 * (q.z || 0);
        }
      }
      strength2 *= Math.sqrt(4 / numChildren);
      treeNode.x = x2 / weight;
      if (nDim > 1) {
        treeNode.y = y2 / weight;
      }
      if (nDim > 2) {
        treeNode.z = z2 / weight;
      }
    } else {
      q = treeNode;
      q.x = q.data.x;
      if (nDim > 1) {
        q.y = q.data.y;
      }
      if (nDim > 2) {
        q.z = q.data.z;
      }
      do
        strength2 += strengths[q.data.index];
      while (q = q.next);
    }
    treeNode.value = strength2;
  }
  function apply(treeNode, x1, arg1, arg2, arg3) {
    if (!treeNode.value)
      return true;
    var x2 = [arg1, arg2, arg3][nDim - 1];
    var x3 = treeNode.x - node.x, y2 = nDim > 1 ? treeNode.y - node.y : 0, z2 = nDim > 2 ? treeNode.z - node.z : 0, w = x2 - x1, l = x3 * x3 + y2 * y2 + z2 * z2;
    if (w * w / theta2 < l) {
      if (l < distanceMax2) {
        if (x3 === 0)
          x3 = jiggle_default(random), l += x3 * x3;
        if (nDim > 1 && y2 === 0)
          y2 = jiggle_default(random), l += y2 * y2;
        if (nDim > 2 && z2 === 0)
          z2 = jiggle_default(random), l += z2 * z2;
        if (l < distanceMin2)
          l = Math.sqrt(distanceMin2 * l);
        node.vx += x3 * treeNode.value * alpha / l;
        if (nDim > 1) {
          node.vy += y2 * treeNode.value * alpha / l;
        }
        if (nDim > 2) {
          node.vz += z2 * treeNode.value * alpha / l;
        }
      }
      return true;
    } else if (treeNode.length || l >= distanceMax2)
      return;
    if (treeNode.data !== node || treeNode.next) {
      if (x3 === 0)
        x3 = jiggle_default(random), l += x3 * x3;
      if (nDim > 1 && y2 === 0)
        y2 = jiggle_default(random), l += y2 * y2;
      if (nDim > 2 && z2 === 0)
        z2 = jiggle_default(random), l += z2 * z2;
      if (l < distanceMin2)
        l = Math.sqrt(distanceMin2 * l);
    }
    do
      if (treeNode.data !== node) {
        w = strengths[treeNode.data.index] * alpha / l;
        node.vx += x3 * w;
        if (nDim > 1) {
          node.vy += y2 * w;
        }
        if (nDim > 2) {
          node.vz += z2 * w;
        }
      }
    while (treeNode = treeNode.next);
  }
  force.initialize = function(_nodes, ...args) {
    nodes = _nodes;
    random = args.find((arg) => typeof arg === "function") || Math.random;
    nDim = args.find((arg) => [1, 2, 3].includes(arg)) || 2;
    initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default(+_), initialize(), force) : strength;
  };
  force.distanceMin = function(_) {
    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
  };
  force.distanceMax = function(_) {
    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
  };
  force.theta = function(_) {
    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
  };
  return force;
}

// src/tools/graph/forcegraph/ForceGraphWorker.ts
var getID = (d) => d.id;
var maxWeight = 5;
var linkStrengths = {
  0: 0,
  1: 0.05,
  2: 0.1,
  3: 0.2,
  4: 0.5
};
var startForceGraph = (data) => {
  const calculateStrengthsEqual = (link2) => {
    const connection = data.links[link2.index];
    return linkStrengths[connection.weight];
  };
  const calculateStrengthsLinear = (link2) => {
    const connection = data.links[link2.index];
    return (connection.weight + 1) / maxWeight * linkStrengths[connection.weight];
  };
  const calculateStrengthsExponential = (link2) => {
    const connection = data.links[link2.index];
    const strength = (connection.weight + 1) / maxWeight;
    return strength * strength * linkStrengths[connection.weight];
  };
  const strengthFuncs = {
    equal: calculateStrengthsEqual,
    linear: calculateStrengthsLinear,
    exponential: calculateStrengthsExponential
  };
  const charge = manyBody_default().strength(-10).distanceMax(100);
  const center = center_default();
  const link = link_default(data.links).id(getID);
  const simulation = simulation_default(data.nodes, 3);
  simulation.force("link", link).force("charge", charge).force("center", center);
  simulation.on("tick", () => {
    const nodes = data.nodes;
    const links = data.links;
    const bufferOut = new Float32Array(nodes.length * 3 + links.length * 6 + 1);
    const linksOffset = nodes.length * 3;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      bufferOut[i * 3] = node.x;
      bufferOut[i * 3 + 1] = node.y;
      bufferOut[i * 3 + 2] = node.z;
    }
    for (let i = 0; i < links.length; i++) {
      const link2 = links[i];
      bufferOut[linksOffset + i * 6] = link2.source.x;
      bufferOut[linksOffset + i * 6 + 1] = link2.source.y;
      bufferOut[linksOffset + i * 6 + 2] = link2.source.z;
      bufferOut[linksOffset + i * 6 + 3] = link2.target.x;
      bufferOut[linksOffset + i * 6 + 4] = link2.target.y;
      bufferOut[linksOffset + i * 6 + 5] = link2.target.z;
    }
    bufferOut[bufferOut.length - 1] = data.id;
    self.postMessage(bufferOut, [bufferOut.buffer]);
  });
  simulation._nodes = data.nodes;
  simulation._links = data.links;
  simulation._charge = charge;
  simulation._link = link;
  simulation._center = center;
  graphs[data.id] = simulation;
  return simulation;
};
var updateForceGraph = (data) => {
  const forceGraph = graphs[data.id];
  if (!forceGraph)
    return;
  if (data.distanceMax) {
    forceGraph._charge.distanceMax(data.distanceMax);
  }
  if (data.repulsion) {
    forceGraph._charge.strength(data.repulsion);
  }
  if (data.restart) {
    const nodes = forceGraph._nodes;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x = 0;
      nodes[i].y = 0;
      nodes[i].z = 0;
      nodes[i].vx = 0;
      nodes[i].vy = 0;
      nodes[i].vz = 0;
    }
    forceGraph.nodes(nodes);
    forceGraph.alpha(1);
    forceGraph.restart();
  }
};
var endForceGraph = ({ id }) => {
  const forceGraph = graphs[id];
  if (!forceGraph)
    return;
  forceGraph.stop();
  delete graphs[id];
};
var graphs = {};
self.postMessage({ type: "ready" });
self.onmessage = (event) => {
  const { type, id } = event.data;
  console.log("worker received", event.data);
  switch (type) {
    case "start":
      startForceGraph(event.data);
      break;
    case "stop":
      endForceGraph(event.data);
      break;
    case "update":
      updateForceGraph(event.data);
    default:
      break;
  }
};
