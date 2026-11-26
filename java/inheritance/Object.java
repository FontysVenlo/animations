// From java.lang.Object (shortened): what every class inherits
// for the methods it doesn't override.
public class Object {

    public String toString() { // @toString
        return getClass().getName() + "@" + Integer.toHexString(hashCode()); // @toString.return
    }

    // A number from the object's identity, not from its fields.
    public native int hashCode(); // @hashCode
}
