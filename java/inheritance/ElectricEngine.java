public class ElectricEngine extends Engine {

    private final int range;

    public ElectricEngine(String identifier, String manufacturer, String description, int range) {
        super(identifier, manufacturer, description, "electric");
        this.range = range;
    }

    public int getRange() { // @getRange
        return range; // @getRange.return
    }
}
