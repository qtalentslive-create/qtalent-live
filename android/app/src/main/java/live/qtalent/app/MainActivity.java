package live.qtalent.app;

import com.getcapacitor.BridgeActivity;
import android.content.res.Configuration;
public class MainActivity extends BridgeActivity {@Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    // This prevents the app from restarting when the user changes
    // settings like font size or dark mode.
  }

  @Override
  protected void attachBaseContext(android.content.Context newBase) {
    // This is the "force" fix.
    // It creates a new configuration override.
    final Configuration override = new Configuration(newBase.getResources().getConfiguration());
    
    // It sets the font scale to 1.0f (100% normal size)
    // and ignores the user's system setting.
    override.fontScale = 1.0f;
    
    // It applies this override to your app.
    super.attachBaseContext(newBase.createConfigurationContext(override));
  }
}
  
  // ▲▲▲ END OF BLOCK ▲▲▲}
