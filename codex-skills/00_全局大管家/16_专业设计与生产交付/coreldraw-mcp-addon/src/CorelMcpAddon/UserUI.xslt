<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:frmwrk="Corel Framework Data"
                exclude-result-prefixes="frmwrk">
  <xsl:output method="xml" encoding="UTF-8" indent="yes"/>

  <!-- CorelDRAW, not PHOTO-PAINT / DESIGNER, owns the docker we add. -->
  <frmwrk:uiconfig>
    <frmwrk:applicationInfo name="CorelDRAW" framework="CorelDRAW" userConfiguration="true"/>
    <!-- The "Tools" menu, where the Corel MCP toggle is inserted. -->
    <frmwrk:compositeNode xPath="/uiConfig/commandBars/commandBarData[@guid='6f114d89-1b8c-4877-a4af-a3624ddd95f6']"/>
    <frmwrk:compositeNode xPath="/uiConfig/frame"/>
  </frmwrk:uiconfig>

  <!-- Copy everything -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- Append the Corel MCP toggle to the Tools menu (once). -->
  <xsl:template match="commandBarData[@guid='6f114d89-1b8c-4877-a4af-a3624ddd95f6']/menu">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
      <xsl:if test="not(./item[@guidRef='d4cda389-33b0-4704-b883-5628be1a426e'])">
        <item guidRef="d4cda389-33b0-4704-b883-5628be1a426e"/>
      </xsl:if>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
