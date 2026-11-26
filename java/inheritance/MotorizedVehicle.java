public abstract class MotorizedVehicle extends Vehicle implements Startable {

    private final Engine engine;

    public MotorizedVehicle(String brand, String model, Engine engine) {
        super(brand, model);
        this.engine = engine;
    }

    public Engine getEngine() { // @getEngine
        return engine; // @getEngine.return
    }

    protected void startEngine() { // @startEngine
        System.out.println("The " + engine.getType() + " engine of the " + this + " is running"); // @startEngine.print
    }

    @Override
    public void move() { // @move
        start(); // @move.start
        System.out.println("The " + this + " drives away"); // @move.print
    }
}
