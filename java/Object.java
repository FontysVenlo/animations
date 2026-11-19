// From java.lang.Object (shortened): what Book inherits
// for the methods it doesn't override.
public class Object {

    // A number from the object's identity, not from its fields.
    public native int hashCode(); // @hash.identity

    public boolean equals(Object obj) {
        return (this == obj); // @eq.identity
    }
}
