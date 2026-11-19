import java.util.ArrayList;

// A simplified HashMap, as in the MOOC: an array of lists.
// The hash code of a key decides in which list its pair goes.
public class HashMap<K, V> {

    private final ArrayList<Pair<K, V>>[] values;
    private int size;

    @SuppressWarnings({"unchecked", "rawtypes"})
    public HashMap() {
        this.values = new ArrayList[8];
        for (int i = 0; i < this.values.length; i++) {
            this.values[i] = new ArrayList<>();
        }
        this.size = 0;
    }

    public void put(K key, V value) {
        int hash = key.hashCode(); // @put.hash
        int index = Math.abs(hash % this.values.length); // @put.index
        for (Pair<K, V> pair : this.values[index]) { // @put.loop
            if (pair.hash == hash && (pair.key == key || key.equals(pair.key))) { // @put.check
                pair.value = value; // @put.replace
                return; // @put.return
            }
        }
        this.values[index].add(new Pair<>(hash, key, value)); // @put.add
        this.size++; // @put.size
    }

    public V get(K key) {
        int hash = key.hashCode(); // @get.hash
        int index = Math.abs(hash % this.values.length); // @get.index
        for (Pair<K, V> pair : this.values[index]) { // @get.loop
            if (pair.hash == hash && (pair.key == key || key.equals(pair.key))) { // @get.check
                return pair.value; // @get.found
            }
        }
        return null; // @get.missing
    }

    public int size() {
        return this.size; // @size.return
    }

    private static class Pair<K, V> {
        private final int hash;
        private final K key;
        private V value;

        private Pair(int hash, K key, V value) {
            this.hash = hash;
            this.key = key;
            this.value = value;
        }
    }
}
