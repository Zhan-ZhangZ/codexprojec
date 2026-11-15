<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:frmwrk="Corel Framework Data"
                exclude-result-prefixes="frmwrk">
  <xsl:output method="xml" encoding="UTF-8" indent="yes"/>

  <frmwrk:uiconfig>
    <frmwrk:applicationInfo userConfiguration="true"/>
  </frmwrk:uiconfig>

  <!-- Copy everything -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="uiConfig/items">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>

      <!-- Toggle button that shows / hides the Corel MCP docker -->
      <itemData guid="d4cda389-33b0-4704-b883-5628be1a426e"
                noBmpOnMenu="true"
                type="checkButton"
                check="*Docker('b094ab85-a650-4633-888b-9366d6e7c241')"
                dynamicCategory="2cc24a3e-fe24-4708-9a74-9c75406eebcd"
                userCaption="Corel MCP"
                enable="true"/>

      <!-- The WPF control that CorelDRAW hosts inside the docker.
           Path is relative to the application's Programs64 folder. -->
      <itemData guid="d7e07ab4-c1bb-4d2e-91cc-0b8a7e436e92"
                type="wpfhost"
                hostedType="Addons\CorelMcp\CorelMcp.dll,CorelMcp.DockerUI"
                enable="true"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="uiConfig/dockers">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>

      <dockerData guid="b094ab85-a650-4633-888b-9366d6e7c241"
                  userCaption="Corel MCP"
                  wantReturn="true"
                  focusStyle="noThrow">
        <container>
          <item dock="fill" margin="0,0,0,0" guidRef="d7e07ab4-c1bb-4d2e-91cc-0b8a7e436e92"/>
        </container>
      </dockerData>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
