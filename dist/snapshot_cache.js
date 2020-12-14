var SnapshotCache = /** @class */ (function () {
    function SnapshotCache(size) {
        this.keys = [];
        this.snapshots = {};
        this.size = size;
    }
    SnapshotCache.prototype.has = function (location) {
        return location.toCacheKey() in this.snapshots;
    };
    SnapshotCache.prototype.get = function (location) {
        if (this.has(location)) {
            var snapshot = this.read(location);
            this.touch(location);
            return snapshot;
        }
    };
    SnapshotCache.prototype.put = function (location, snapshot) {
        this.write(location, snapshot);
        this.touch(location);
        return snapshot;
    };
    SnapshotCache.prototype.clear = function () {
        this.snapshots = {};
    };
    // Private
    SnapshotCache.prototype.read = function (location) {
        return this.snapshots[location.toCacheKey()];
    };
    SnapshotCache.prototype.write = function (location, snapshot) {
        this.snapshots[location.toCacheKey()] = snapshot;
    };
    SnapshotCache.prototype.touch = function (location) {
        var key = location.toCacheKey();
        var index = this.keys.indexOf(key);
        if (index > -1)
            this.keys.splice(index, 1);
        this.keys.unshift(key);
        this.trim();
    };
    SnapshotCache.prototype.trim = function () {
        for (var _i = 0, _a = this.keys.splice(this.size); _i < _a.length; _i++) {
            var key = _a[_i];
            delete this.snapshots[key];
        }
    };
    return SnapshotCache;
}());
export { SnapshotCache };
//# sourceMappingURL=snapshot_cache.js.map