public class Engine extends Part {

    private final String type;

    public Engine(String identifier, String manufacturer, String description, String type) {
        super(identifier, manufacturer, description);
        this.type = type;
    }

    public Engine(String identifier, String manufacturer, String description) {
        this(identifier, manufacturer, description, "combustion");
    }

    public String getType() { // @getType
        return type; // @getType.return
    }

    @Override
    public String toString() { // @toString
        return super.toString() + " (" + type + ")"; // @toString.return
    }
}
